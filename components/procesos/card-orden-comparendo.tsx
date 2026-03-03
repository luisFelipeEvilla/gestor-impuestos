"use client";

import { useActionState, useState, useRef } from "react";
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
import { ConfirmarEliminacionModal } from "@/components/confirmar-eliminacion-modal";
import {
  subirOrdenComparendo,
  actualizarOrdenComparendo,
  actualizarVisibleOrdenComparendo,
  eliminarOrdenComparendo,
} from "@/lib/actions/orden-comparendo";
import type { OrdenComparendo } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const DOCUMENTO_URL = (procesoId: number) =>
  `/api/procesos/${procesoId}/orden-comparendo/documento`;

function puedePrevisualizar(mimeType: string): "pdf" | "imagen" | null {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "imagen";
  return null;
}

type CardOrdenComparendoProps = {
  procesoId: number;
  orden: OrdenComparendo | null;
};

export function CardOrdenComparendo({ procesoId, orden }: CardOrdenComparendoProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [openEliminar, setOpenEliminar] = useState(false);
  const formEliminarRef = useRef<HTMLFormElement>(null);
  const confirmandoEliminarRef = useRef(false);

  const [uploadState, uploadAction] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      const archivo = formData.get("archivo") as File | null;
      if (!archivo?.size) return { error: "Selecciona un archivo." };
      const visible = formData.get("visible") === "on";
      const r = await subirOrdenComparendo(procesoId, archivo, visible);
      if (r?.error) return r;
      router.refresh();
      return {};
    },
    null
  );

  const [updateState, updateAction] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      const archivo = formData.get("archivo") as File | null;
      const visible = formData.get("visible") === "on";
      const r = await actualizarOrdenComparendo(
        procesoId,
        archivo?.size ? archivo : undefined,
        visible
      );
      if (r?.error) return r;
      setEditing(false);
      router.refresh();
      return {};
    },
    null
  );

  const [toggleVisibleState, toggleVisibleAction] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      const visible = formData.get("visible") === "true";
      const r = await actualizarVisibleOrdenComparendo(procesoId, visible);
      if (r?.error) return r;
      router.refresh();
      return {};
    },
    null
  );

  const [deleteState, deleteAction] = useActionState(
    async (_: { error?: string } | null) => {
      const r = await eliminarOrdenComparendo(procesoId);
      if (r?.error) return r;
      setEditing(false);
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
          Documento de comparendo asociado al proceso. Puedes marcar si es visible o no.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {orden && !editing ? (
          <>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Documento</dt>
                <dd>
                  <a
                    href={DOCUMENTO_URL(procesoId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {orden.nombreOriginal}
                  </a>
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-muted-foreground">Visible</dt>
                <dd>
                  <form action={toggleVisibleAction} className="flex items-center gap-2">
                    <input
                      type="hidden"
                      name="visible"
                      value={orden.visible ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      role="switch"
                      aria-checked={orden.visible}
                      aria-label={orden.visible ? "Ocultar documento" : "Marcar como visible"}
                      tabIndex={0}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        orden.visible ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                          orden.visible ? "translate-x-4" : "translate-x-0.5"
                        )}
                      />
                    </button>
                    <span className="text-muted-foreground text-xs">
                      {orden.visible ? "Visible" : "Oculto"}
                    </span>
                  </form>
                </dd>
              </div>
            </dl>

            {(() => {
              const tipoPreview = puedePrevisualizar(orden.mimeType);
              if (!tipoPreview) return null;
              return (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm font-medium">Vista previa</p>
                  <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                    {tipoPreview === "pdf" && (
                      <iframe
                        src={DOCUMENTO_URL(procesoId)}
                        title={`Vista previa: ${orden.nombreOriginal}`}
                        className="w-full min-h-[420px] h-[60vh] max-h-[720px]"
                      />
                    )}
                    {tipoPreview === "imagen" && (
                      <img
                        src={DOCUMENTO_URL(procesoId)}
                        alt={orden.nombreOriginal}
                        className="w-full max-h-[70vh] object-contain"
                      />
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                Reemplazar documento
              </Button>
              <ConfirmarEliminacionModal
                open={openEliminar}
                onOpenChange={setOpenEliminar}
                title="Eliminar comparendo"
                description="Se eliminará el documento. No se puede deshacer."
                onConfirm={() => {
                  confirmandoEliminarRef.current = true;
                  formEliminarRef.current?.requestSubmit();
                }}
              />
              <form
                ref={formEliminarRef}
                action={deleteAction}
                onSubmit={(e) => {
                  if (!confirmandoEliminarRef.current) {
                    e.preventDefault();
                    setOpenEliminar(true);
                    return;
                  }
                  confirmandoEliminarRef.current = false;
                }}
              >
                <Button type="submit" variant="outline" size="sm" className="text-destructive">
                  Eliminar
                </Button>
              </form>
            </div>
            {toggleVisibleState?.error && (
              <p className="text-destructive text-sm" role="alert">
                {toggleVisibleState.error}
              </p>
            )}
            {deleteState?.error && (
              <p className="text-destructive text-sm" role="alert">
                {deleteState.error}
              </p>
            )}
          </>
        ) : orden && editing ? (
          <form action={updateAction} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="archivo-orden-comparendo">Reemplazar documento</Label>
              <FileInputDropzone
                id="archivo-orden-comparendo"
                name="archivo"
                accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,text/plain"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="visible-update-oc"
                name="visible"
                defaultChecked={orden.visible}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="visible-update-oc">Visible</Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Guardar</Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
            {updateState?.error && (
              <p className="text-destructive text-sm" role="alert">
                {updateState.error}
              </p>
            )}
          </form>
        ) : !orden ? (
          <form action={uploadAction} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="archivo-orden-comparendo-new">Documento</Label>
              <FileInputDropzone
                id="archivo-orden-comparendo-new"
                name="archivo"
                accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,text/plain"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="visible-new-oc"
                name="visible"
                defaultChecked
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="visible-new-oc">Visible</Label>
            </div>
            <Button type="submit">Subir comparendo</Button>
            {uploadState?.error && (
              <p className="text-destructive text-sm" role="alert">
                {uploadState.error}
              </p>
            )}
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
