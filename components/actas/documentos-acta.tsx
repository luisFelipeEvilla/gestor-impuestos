"use client";

import { useActionState, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmarEliminacionModal } from "@/components/confirmar-eliminacion-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  subirDocumentoActa,
  eliminarDocumentoActa,
  obtenerPresignedUrlDocumentoActa,
  registrarDocumentoActa,
  type EstadoDocumentoActa,
} from "@/lib/actions/documentos-acta";

export type DocumentoActaItem = {
  id: number;
  nombreOriginal: string;
  mimeType: string;
  tamano: number;
  creadoEn: Date;
};

type SubirDocumentoActaFormProps = {
  actaId: string;
};

const MAX_S3_MB = 100;

export function SubirDocumentoActaForm({ actaId }: SubirDocumentoActaFormProps) {
  const router = useRouter();
  const forceDirectSubmit = useRef(false);
  const [state, formAction] = useActionState(
    (_prev: EstadoDocumentoActa | null, formData: FormData) =>
      subirDocumentoActa(formData),
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
      const presigned = await obtenerPresignedUrlDocumentoActa(
        actaId,
        file.name,
        file.type || "application/octet-stream",
        file.size
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

      const reg = await registrarDocumentoActa(
        actaId,
        presigned.rutaArchivo,
        file.name,
        file.type || "application/octet-stream",
        file.size
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
      <input type="hidden" name="actaId" value={actaId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid flex-1 min-w-[200px] gap-1.5">
          <Label htmlFor="archivo-acta" className="text-xs">
            Archivo (PDF, imágenes, Word, Excel; hasta {MAX_S3_MB} MB con S3)
          </Label>
          <Input
            id="archivo-acta"
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

type ListaDocumentosActaProps = {
  actaId: string;
  documentos: DocumentoActaItem[];
  puedeEliminar?: boolean;
};

function formatTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ListaDocumentosActa({
  actaId,
  documentos,
  puedeEliminar = false,
}: ListaDocumentosActaProps) {
  if (documentos.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No hay documentos adjuntos.
      </p>
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
              href={`/api/actas/${actaId}/documentos/${doc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline truncate block"
            >
              {doc.nombreOriginal}
            </a>
            <span className="text-muted-foreground text-xs">
              {formatTamano(doc.tamano)}
              {" · "}
              {new Date(doc.creadoEn).toLocaleDateString("es-CO", {
                dateStyle: "short",
              })}
            </span>
          </div>
          {puedeEliminar && (
            <EliminarDocumentoActaButton documentoId={doc.id} />
          )}
        </li>
      ))}
    </ul>
  );
}

function EliminarDocumentoActaButton({ documentoId }: { documentoId: number }) {
  const [state, formAction] = useActionState(
    (_prev: EstadoDocumentoActa | null, formData: FormData) =>
      eliminarDocumentoActa(formData),
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
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
        >
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
