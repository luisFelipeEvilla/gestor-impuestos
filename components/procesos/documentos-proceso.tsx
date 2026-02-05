"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  subirDocumentoProceso,
  eliminarDocumentoProceso,
  type EstadoDocumentoProceso,
} from "@/lib/actions/documentos-proceso";

type DocumentoItem = {
  id: number;
  nombreOriginal: string;
  mimeType: string;
  tamano: number;
  creadoEn: Date;
};

type SubirDocumentoFormProps = {
  procesoId: number;
};

export function SubirDocumentoForm({ procesoId }: SubirDocumentoFormProps) {
  const [state, formAction] = useActionState(
    (_prev: EstadoDocumentoProceso | null, formData: FormData) =>
      subirDocumentoProceso(formData),
    null
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="procesoId" value={procesoId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid flex-1 min-w-[200px] gap-1.5">
          <Label htmlFor="archivo" className="text-xs">
            Archivo (PDF, imágenes, Word, Excel; máx. 10 MB)
          </Label>
          <Input
            id="archivo"
            name="archivo"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv"
            aria-invalid={!!state?.error}
          />
        </div>
        <Button type="submit" size="sm">
          Adjuntar
        </Button>
      </div>
      {state?.error && (
        <p className="text-destructive text-xs" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

type ListaDocumentosProps = {
  procesoId: number;
  documentos: DocumentoItem[];
  puedeEliminar?: boolean;
};

function formatTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ListaDocumentos({
  procesoId,
  documentos,
  puedeEliminar = false,
}: ListaDocumentosProps) {
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
              href={`/api/procesos/${procesoId}/documentos/${doc.id}`}
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm("¿Eliminar este documento? No se puede deshacer.")) {
      e.preventDefault();
    }
  };

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <input type="hidden" name="documentoId" value={documentoId} />
      <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
        Eliminar
      </Button>
      {state?.error && (
        <p className="text-destructive text-xs w-full" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
