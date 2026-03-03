"use client";

import { useActionState, useState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { CardSectionAccordion } from "@/components/ui/card-accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileInputDropzone } from "@/components/ui/file-input-dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmarEliminacionModal } from "@/components/confirmar-eliminacion-modal";
import {
  crearOrdenResolucion,
  actualizarOrdenResolucion,
  eliminarOrdenResolucion,
} from "@/lib/actions/ordenes-resolucion";
import type { OrdenResolucion } from "@/lib/db/schema";
import { Eye, Download, Pencil, Trash2, Loader2, FileText, Plus } from "lucide-react";

const TIPO_RESOLUCION_OPTIONS: { value: "sancion" | "resumen_ap"; label: string }[] = [
  { value: "sancion", label: "Sanción" },
  { value: "resumen_ap", label: "Resumen AP" },
];

const DOCUMENTO_URL = (procesoId: number, descargar?: boolean) => {
  const base = `/api/procesos/${procesoId}/orden-resolucion/documento`;
  return descargar ? `${base}?descargar=1` : base;
};

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CO", { timeZone: "UTC" });
}

function labelTipoResolucion(value: string | null | undefined): string {
  if (!value) return "—";
  return TIPO_RESOLUCION_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function TipoResolucionBadge({ tipo }: { tipo: string | null | undefined }) {
  if (!tipo) return <span className="text-muted-foreground">—</span>;
  const variant = tipo === "sancion" ? "destructive" : "secondary";
  return <Badge variant={variant}>{labelTipoResolucion(tipo)}</Badge>;
}

function SubmitButton({ label, loadingLabel }: { label: string; loadingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 mr-2 animate-spin" aria-hidden />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}

type CardOrdenResolucionProps = {
  procesoId: number;
  orden: OrdenResolucion | null;
};

export function CardOrdenResolucion({ procesoId, orden }: CardOrdenResolucionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openEliminar, setOpenEliminar] = useState(false);
  const formEliminarRef = useRef<HTMLFormElement>(null);
  const confirmandoEliminarRef = useRef(false);

  const [createState, createAction] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      const tipo = formData.get("tipoResolucion") as string | null;
      const r = await crearOrdenResolucion(
        procesoId,
        (formData.get("numeroResolucion") as string)?.trim() ?? "",
        (formData.get("fechaResolucion") as string)?.trim() || null,
        (formData.get("archivo") as File)?.size ? (formData.get("archivo") as File) : undefined,
        (formData.get("codigoInfraccion") as string)?.trim() || null,
        tipo === "sancion" || tipo === "resumen_ap" ? tipo : null
      );
      if (r?.error) return r;
      setCreating(false);
      router.refresh();
      return {};
    },
    null
  );

  const [updateState, updateAction] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      const tipo = formData.get("tipoResolucion") as string | null;
      const r = await actualizarOrdenResolucion(
        procesoId,
        (formData.get("numeroResolucion") as string)?.trim() ?? "",
        (formData.get("fechaResolucion") as string)?.trim() || null,
        (formData.get("archivo") as File)?.size ? (formData.get("archivo") as File) : undefined,
        (formData.get("codigoInfraccion") as string)?.trim() || null,
        tipo === "sancion" || tipo === "resumen_ap" ? tipo : null
      );
      if (r?.error) return r;
      setEditing(false);
      router.refresh();
      return {};
    },
    null
  );

  const [deleteState, deleteAction] = useActionState(
    async (_: { error?: string } | null) => {
      const r = await eliminarOrdenResolucion(procesoId);
      if (r?.error) return r;
      setEditing(false);
      router.refresh();
      return {};
    },
    null
  );

  const showForm = creating || (editing && orden);

  return (
    <CardSectionAccordion
      title="Orden de resolución"
      description="Número de resolución y documento adjunto que originan el proceso de cobro."
      defaultOpen
    >
      {orden && !showForm ? (
        <div className="space-y-4">
          {/* Metadata grid */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div className="col-span-2">
              <dt className="text-muted-foreground text-xs mb-0.5">Nº de resolución</dt>
              <dd className="font-semibold">{orden.numeroResolucion}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs mb-0.5">Fecha</dt>
              <dd>{formatDate(orden.fechaResolucion)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs mb-0.5">Tipo</dt>
              <dd><TipoResolucionBadge tipo={orden.tipoResolucion} /></dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs mb-0.5">Código infracción</dt>
              <dd className="font-mono text-xs">{orden.codigoInfraccion ?? "—"}</dd>
            </div>
          </dl>

          {/* Document row */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <FileText className="size-4 text-muted-foreground shrink-0" aria-hidden />
            {orden.rutaArchivo && orden.nombreOriginal ? (
              <>
                <span className="text-sm font-medium flex-1 truncate">{orden.nombreOriginal}</span>
                <Button variant="outline" size="icon" className="size-8 shrink-0" asChild>
                  <a
                    href={DOCUMENTO_URL(procesoId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Ver documento"
                  >
                    <Eye className="size-4" aria-hidden />
                  </a>
                </Button>
                <Button variant="outline" size="icon" className="size-8 shrink-0" asChild>
                  <a
                    href={DOCUMENTO_URL(procesoId, true)}
                    download={orden.nombreOriginal}
                    aria-label="Descargar documento"
                  >
                    <Download className="size-4" aria-hidden />
                  </a>
                </Button>
              </>
            ) : (
              <span className="text-sm text-muted-foreground italic">Sin documento adjunto</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" aria-hidden />
              Editar
            </Button>
            <ConfirmarEliminacionModal
              open={openEliminar}
              onOpenChange={setOpenEliminar}
              title="Eliminar orden de resolución"
              description="Se eliminará el registro y el documento asociado. No se puede deshacer."
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
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Eliminar
              </Button>
            </form>
          </div>

          {deleteState?.error && (
            <p className="text-destructive text-sm" role="alert">{deleteState.error}</p>
          )}
        </div>
      ) : showForm ? (
        <form action={orden ? updateAction : createAction} className="space-y-4">
          <input type="hidden" name="procesoId" value={procesoId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="numeroResolucion-orden">Nº de resolución</Label>
              <Input
                id="numeroResolucion-orden"
                name="numeroResolucion"
                type="text"
                required
                defaultValue={orden?.numeroResolucion ?? ""}
                placeholder="Ej. 001 de 2026"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fechaResolucion-orden">Fecha de resolución <span className="text-muted-foreground">(opcional)</span></Label>
              <Input
                id="fechaResolucion-orden"
                name="fechaResolucion"
                type="date"
                defaultValue={orden?.fechaResolucion ? String(orden.fechaResolucion).slice(0, 10) : ""}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="codigoInfraccion-orden">Código infracción <span className="text-muted-foreground">(opcional)</span></Label>
              <Input
                id="codigoInfraccion-orden"
                name="codigoInfraccion"
                type="text"
                defaultValue={orden?.codigoInfraccion ?? ""}
                placeholder="Ej. A01"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tipoResolucion-orden">Tipo de resolución <span className="text-muted-foreground">(opcional)</span></Label>
              <select
                id="tipoResolucion-orden"
                name="tipoResolucion"
                defaultValue={orden?.tipoResolucion ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Seleccionar...</option>
                {TIPO_RESOLUCION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="archivo-orden">
              {orden?.rutaArchivo ? "Reemplazar documento" : "Documento adjunto"}
              {" "}<span className="text-muted-foreground">(opcional)</span>
            </Label>
            {orden?.rutaArchivo && orden.nombreOriginal && (
              <p className="text-xs text-muted-foreground">
                Actual: <span className="font-medium">{orden.nombreOriginal}</span>. Deja vacío para conservarlo.
              </p>
            )}
            <FileInputDropzone
              id="archivo-orden"
              name="archivo"
              accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,text/plain"
            />
          </div>

          <div className="flex gap-2">
            <SubmitButton
              label={orden ? "Guardar cambios" : "Crear orden"}
              loadingLabel={orden ? "Guardando…" : "Creando…"}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => { setEditing(false); setCreating(false); }}
            >
              Cancelar
            </Button>
          </div>

          {(orden ? updateState?.error : createState?.error) && (
            <p className="text-destructive text-sm" role="alert">
              {(orden ? updateState : createState)?.error}
            </p>
          )}
        </form>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="size-4" aria-hidden />
            <span className="text-sm">No hay orden de resolución registrada.</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setCreating(true)}
          >
            <Plus className="size-3.5" aria-hidden />
            Agregar orden de resolución
          </Button>
        </div>
      )}
    </CardSectionAccordion>
  );
}
