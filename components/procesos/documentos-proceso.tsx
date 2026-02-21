"use client";

import { useActionState, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConfirmarEliminacionModal } from "@/components/confirmar-eliminacion-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  subirDocumentoProceso,
  eliminarDocumentoProceso,
  obtenerPresignedUrlDocumentoProceso,
  registrarDocumentoProceso,
} from "@/lib/actions/documentos-proceso";
import {
  type CategoriaDocumentoNota,
  type EstadoDocumentoProceso,
} from "@/lib/proceso-categorias";
import { TIPOS_DOCUMENTO_PROCESO, labelTipoDocumentoProceso } from "@/lib/tipos-documento-proceso";

export type DocumentoItem = {
  id: number;
  nombreOriginal: string;
  mimeType: string;
  tamano: number;
  creadoEn: Date;
  categoria?: string;
  /** Tipo de documento (Mandamiento de pago, Medidas cautelares, etc.) */
  tipoDocumento?: string | null;
  /** Nombre del usuario que subió el documento (opcional; si no existe en BD se muestra "—") */
  creadoPorNombre?: string | null;
};

function labelTipoDocumento(mimeType: string): string {
  const t = (mimeType || "").toLowerCase();
  if (t.includes("pdf")) return "PDF";
  if (t.includes("word") || t.includes("msword") || t.includes("document")) return "Word";
  if (t.includes("sheet") || t.includes("excel") || t.includes("spreadsheet")) return "Excel";
  if (t.includes("image") || t.includes("jpeg") || t.includes("jpg") || t.includes("png") || t.includes("gif") || t.includes("webp")) return "Imagen";
  if (t.includes("text/plain") || t.includes("csv")) return "Texto / CSV";
  return "Documento";
}

type SubirDocumentoFormProps = {
  procesoId: number;
  /** Categoría del documento: general, en_contacto, acuerdo_pago, cobro_coactivo */
  categoria: CategoriaDocumentoNota;
};

const MAX_S3_MB = 100;

export function SubirDocumentoForm({ procesoId, categoria }: SubirDocumentoFormProps) {
  const router = useRouter();
  const forceDirectSubmit = useRef(false);
  const [state, formAction] = useActionState(
    (_prev: EstadoDocumentoProceso | null, formData: FormData) =>
      subirDocumentoProceso(formData),
    null
  );
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (forceDirectSubmit.current) {
      forceDirectSubmit.current = false;
      return;
    }
    e.preventDefault();
    setSubmitError(null);
    const form = e.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>('input[name="archivo"]');
    const file = fileInput?.files?.[0];
    if (!file || file.size === 0) {
      setSubmitError("Selecciona un archivo.");
      return;
    }

    setLoading(true);
    try {
      const presigned = await obtenerPresignedUrlDocumentoProceso(
        procesoId,
        file.name,
        file.type || "application/octet-stream",
        file.size,
        categoria
      );

      if (presigned.error && presigned.error !== "DIRECT_UPLOAD") {
        setSubmitError(presigned.error);
        return;
      }
      if (presigned.error === "DIRECT_UPLOAD" || !presigned.url || !presigned.rutaArchivo) {
        forceDirectSubmit.current = true;
        form.requestSubmit();
        return;
      }

      const putRes = await fetch(presigned.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!putRes.ok) {
        setSubmitError("Error al subir el archivo. Vuelve a intentarlo.");
        return;
      }

      const tipoDocumento = (form.get("tipoDocumento") as string)?.trim() || "otro";
      const reg = await registrarDocumentoProceso(
        procesoId,
        presigned.rutaArchivo,
        file.name,
        file.type || "application/octet-stream",
        file.size,
        categoria,
        tipoDocumento as import("@/lib/tipos-documento-proceso").TipoDocumentoProceso
      );
      if (reg.error) {
        setSubmitError(reg.error);
        return;
      }
      form.reset();
      router.refresh();
      setLoading(false);
    } catch {
      setSubmitError("Error inesperado. Puedes intentar adjuntar de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-2">
      <input type="hidden" name="procesoId" value={procesoId} />
      <input type="hidden" name="categoria" value={categoria} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1.5 min-w-[180px]">
          <Label htmlFor="tipoDocumento-subir" className="text-xs">
            Tipo de documento
          </Label>
          <select
            id="tipoDocumento-subir"
            name="tipoDocumento"
            required
            className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            aria-label="Tipo de documento"
          >
            {TIPOS_DOCUMENTO_PROCESO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid flex-1 min-w-[200px] gap-1.5">
          <Label htmlFor="archivo" className="text-xs">
            Archivo (PDF, imágenes, Word, Excel; hasta {MAX_S3_MB} MB con S3)
          </Label>
          <Input
            id="archivo"
            name="archivo"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv"
            aria-invalid={!!(state?.error || submitError)}
            disabled={loading}
          />
        </div>
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Subiendo…" : "Adjuntar"}
        </Button>
      </div>
      {(state?.error || submitError) && (
        <p className="text-destructive text-xs" role="alert">
          {submitError ?? state?.error}
        </p>
      )}
    </form>
  );
}

type ListaDocumentosProps = {
  procesoId: number;
  documentos: DocumentoItem[];
  puedeEliminar?: boolean;
  /** "list" = lista compacta; "table" = tabla con nombre, tipo, subido por, fecha, acciones */
  variant?: "list" | "table";
};

function formatTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFechaSubida(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

export function ListaDocumentos({
  procesoId,
  documentos,
  puedeEliminar = false,
  variant = "list",
}: ListaDocumentosProps) {
  if (documentos.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No hay documentos adjuntos.
      </p>
    );
  }

  if (variant === "table") {
    return (
      <div className="relative w-full overflow-x-auto rounded-xl border border-border/80 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60">
              <TableHead className="font-medium">Nombre</TableHead>
              <TableHead className="font-medium">Tipo de documento</TableHead>
              <TableHead className="font-medium">Formato</TableHead>
              <TableHead className="font-medium">Subido por</TableHead>
              <TableHead className="font-medium">Fecha</TableHead>
              {puedeEliminar && (
                <TableHead className="w-[100px] text-right font-medium">Acciones</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {documentos.map((doc) => (
              <TableRow key={doc.id} className="border-border/60">
                <TableCell className="font-medium">
                  <a
                    href={`/api/procesos/${procesoId}/documentos/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {doc.nombreOriginal}
                  </a>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {labelTipoDocumentoProceso(doc.tipoDocumento)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {labelTipoDocumento(doc.mimeType)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {doc.creadoPorNombre ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {formatFechaSubida(doc.creadoEn)}
                </TableCell>
                {puedeEliminar && (
                  <TableCell className="text-right">
                    <EliminarDocumentoButton documentoId={doc.id} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <ul className="space-y-2" role="list">
      {documentos.map((doc) => (
        <li
          key={doc.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
        >
          <div className="min-w-0 flex-1">
            <a
              href={`/api/procesos/${procesoId}/documentos/${doc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline truncate block"
            >
              {doc.nombreOriginal}
            </a>
            <span className="text-muted-foreground text-xs">
              {labelTipoDocumentoProceso(doc.tipoDocumento)}
              {" · "}
              {formatTamano(doc.tamano)}
              {" · "}
              {new Date(doc.creadoEn).toLocaleDateString("es-CO", {
                dateStyle: "short",
              })}
            </span>
          </div>
          {puedeEliminar && (
            <EliminarDocumentoButton documentoId={doc.id} />
          )}
        </li>
      ))}
    </ul>
  );
}

function EliminarDocumentoButton({ documentoId }: { documentoId: number }) {
  const [state, formAction] = useActionState(
    (_prev: EstadoDocumentoProceso | null, formData: FormData) =>
      eliminarDocumentoProceso(formData),
    null
  );
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmandoRef = useRef(false);

  return (
    <>
      <ConfirmarEliminacionModal
        open={open}
        onOpenChange={setOpen}
        title="Eliminar documento"
        description="No se puede deshacer."
        onConfirm={() => {
          confirmandoRef.current = true;
          formRef.current?.requestSubmit();
        }}
      />
      <form
        ref={formRef}
        action={formAction}
        onSubmit={(e) => {
          if (!confirmandoRef.current) {
            e.preventDefault();
            setOpen(true);
            return;
          }
          confirmandoRef.current = false;
        }}
      >
        <input type="hidden" name="documentoId" value={documentoId} />
        <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          Eliminar
        </Button>
      </form>
      {state?.error && (
        <p className="text-destructive text-xs w-full" role="alert">
          {state.error}
        </p>
      )}
    </>
  );
}
