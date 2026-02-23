"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileInputDropzone } from "@/components/ui/file-input-dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarEstadoCompromisoAction } from "@/lib/actions/compromisos-acta";

const ESTADOS: { value: "pendiente" | "cumplido" | "no_cumplido"; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "cumplido", label: "Cumplido" },
  { value: "no_cumplido", label: "No cumplido" },
];

type FormEstadoCompromisoProps = {
  compromisoId: number;
  estadoActual: "pendiente" | "cumplido" | "no_cumplido";
  detalleActual: string | null;
};

export function FormEstadoCompromiso({
  compromisoId,
  estadoActual,
  detalleActual,
}: FormEstadoCompromisoProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_prev: { error?: string } | null, fd: FormData) => {
      const res = await actualizarEstadoCompromisoAction(fd);
      if (!res?.error) router.refresh();
      return res;
    },
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-3" encType="multipart/form-data">
      <input type="hidden" name="compromisoId" value={compromisoId} readOnly aria-hidden />
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1.5 min-w-[120px]">
          <Label htmlFor={`estado-${compromisoId}`} className="text-xs">
            Estado
          </Label>
          <select
            id={`estado-${compromisoId}`}
            name="estado"
            defaultValue={estadoActual}
            className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-2 py-1 text-sm outline-none focus-visible:ring-2"
            aria-label="Estado del compromiso"
          >
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5 flex-1 min-w-[180px]">
          <Label htmlFor={`detalle-${compromisoId}`} className="text-xs">
            Detalle / motivo
          </Label>
          <Input
            id={`detalle-${compromisoId}`}
            name="detalle"
            type="text"
            defaultValue={detalleActual ?? ""}
            placeholder="Observación o motivo del cambio"
            className="h-9 text-sm"
            aria-label="Detalle de la actualización"
          />
        </div>
        <Button type="submit" size="sm">
          Actualizar
        </Button>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`archivos-${compromisoId}`} className="text-xs">
          Adjuntar documentos (opcional)
        </Label>
        <FileInputDropzone
          id={`archivos-${compromisoId}`}
          name="archivos"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv"
          aria-label="Archivos a adjuntar a esta actualización"
        />
        <p className="text-muted-foreground text-xs">
          PDF, imágenes, Word, Excel o texto; máx. 10 MB por archivo.
        </p>
      </div>
      {state?.error && (
        <p className="text-destructive text-xs" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
