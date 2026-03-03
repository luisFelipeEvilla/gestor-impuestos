"use client";

import { useActionState, useState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileInputDropzone } from "@/components/ui/file-input-dropzone";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmarEliminacionModal } from "@/components/confirmar-eliminacion-modal";
import {
  subirOrdenComparendo,
  actualizarLegibleOrdenComparendoDesdeFormData,
  eliminarOrdenComparendoDesdeFormData,
} from "@/lib/actions/orden-comparendo";
import { Eye, Download, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DOCUMENTO_URL = (procesoId: number, docId: number, descargar?: boolean) => {
  const base = `/api/procesos/${procesoId}/orden-comparendo/${docId}/documento`;
  return descargar ? `${base}?descargar=1` : base;
};

export type OrdenComparendoRow = {
  id: number;
  procesoId: number;
  nombreOriginal: string;
  mimeType: string;
  legible: boolean;
  creadoEn: Date;
  subidoPorNombre: string | null;
};

type CardOrdenComparendoProps = {
  procesoId: number;
  ordenes: OrdenComparendoRow[];
};

function BotonEliminarConEstado({ nombreOriginal }: { nombreOriginal: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="icon"
      className="size-8 shrink-0 text-destructive hover:text-destructive"
      aria-label={pending ? "Eliminando…" : `Eliminar ${nombreOriginal}`}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Trash2 className="size-4" aria-hidden />
      )}
    </Button>
  );
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        dateStyle: "short",
        timeStyle: "short",
      });
}

export function CardOrdenComparendo({ procesoId, ordenes }: CardOrdenComparendoProps) {
  const router = useRouter();
  const [openEliminarId, setOpenEliminarId] = useState<number | null>(null);
  const confirmandoEliminarRef = useRef(false);

  const [uploadState, uploadAction] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      const archivo = formData.get("archivo") as File | null;
      if (!archivo?.size) return { error: "Selecciona un archivo." };
      const legible = formData.get("legible") === "on";
      const r = await subirOrdenComparendo(procesoId, archivo, legible);
      if (r?.error) return r;
      router.refresh();
      return {};
    },
    null
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Comparendo</CardTitle>
        <CardDescription>
          Documento Físico del comparendo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {ordenes.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del archivo</TableHead>
                <TableHead>Creador</TableHead>
                <TableHead>Fecha de creación</TableHead>
                <TableHead className="w-[100px]">Legible</TableHead>
                <TableHead className="w-[200px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenes.map((orden) => (
                <TableRow key={orden.id}>
                  <TableCell className="font-medium">{orden.nombreOriginal}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {orden.subidoPorNombre ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDateTime(orden.creadoEn)}
                  </TableCell>
                  <TableCell>
                    <form
                      action={async (formData: FormData) => {
                        await actualizarLegibleOrdenComparendoDesdeFormData(formData);
                        router.refresh();
                      }}
                      className="inline-flex items-center gap-2"
                    >
                      <input type="hidden" name="documentoId" value={orden.id} />
                      <input type="hidden" name="procesoId" value={procesoId} />
                      <input
                        type="hidden"
                        name="legible"
                        value={orden.legible ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        role="checkbox"
                        aria-checked={orden.legible}
                        aria-label={orden.legible ? "Marcar como no legible" : "Marcar como legible"}
                        tabIndex={0}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          orden.legible ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                            orden.legible ? "translate-x-4" : "translate-x-0.5"
                          )}
                        />
                      </button>
                      <span className="text-muted-foreground text-xs">
                        {orden.legible ? "Sí" : "No"}
                      </span>
                    </form>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="icon" className="size-8 shrink-0" asChild>
                        <a
                          href={DOCUMENTO_URL(procesoId, orden.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Ver ${orden.nombreOriginal}`}
                        >
                          <Eye className="size-4" aria-hidden />
                        </a>
                      </Button>
                      <Button variant="outline" size="icon" className="size-8 shrink-0" asChild>
                        <a
                          href={DOCUMENTO_URL(procesoId, orden.id, true)}
                          download={orden.nombreOriginal}
                          aria-label={`Descargar ${orden.nombreOriginal}`}
                        >
                          <Download className="size-4" aria-hidden />
                        </a>
                      </Button>
                      <ConfirmarEliminacionModal
                        open={openEliminarId === orden.id}
                        onOpenChange={(open) => setOpenEliminarId(open ? orden.id : null)}
                        title="Eliminar comparendo"
                        description="Se eliminará este documento. No se puede deshacer."
                        onConfirm={() => {
                          confirmandoEliminarRef.current = true;
                          setOpenEliminarId(null);
                          const form = document.querySelector(
                            `form[data-delete-comparendo-id="${orden.id}"]`
                          ) as HTMLFormElement;
                          form?.requestSubmit();
                        }}
                      />
                      <form
                        data-delete-comparendo-id={orden.id}
                        action={async (formData: FormData) => {
                          await eliminarOrdenComparendoDesdeFormData(formData);
                          router.refresh();
                        }}
                        onSubmit={(e) => {
                          if (!confirmandoEliminarRef.current) {
                            e.preventDefault();
                            setOpenEliminarId(orden.id);
                            return;
                          }
                          confirmandoEliminarRef.current = false;
                        }}
                        className="inline-block shrink-0"
                      >
                        <input type="hidden" name="documentoId" value={orden.id} />
                        <input type="hidden" name="procesoId" value={procesoId} />
                        <BotonEliminarConEstado nombreOriginal={orden.nombreOriginal} />
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="space-y-4 pt-2 border-t border-border">
          <p className="text-muted-foreground text-sm font-medium">
            {ordenes.length === 0 ? "Subir documento" : "Subir otro documento"}
          </p>
          <form action={uploadAction} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="archivo-orden-comparendo-new">Archivo</Label>
              <FileInputDropzone
                id="archivo-orden-comparendo-new"
                name="archivo"
                accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,text/plain"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="legible-new-oc"
                name="legible"
                defaultChecked
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="legible-new-oc">Documento legible</Label>
            </div>
            <Button type="submit">
              {ordenes.length === 0 ? "Subir comparendo" : "Subir otro comparendo"}
            </Button>
            {uploadState?.error && (
              <p className="text-destructive text-sm" role="alert">
                {uploadState.error}
              </p>
            )}
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
