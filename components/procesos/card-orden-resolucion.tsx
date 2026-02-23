"use client";

import { useActionState, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CardSectionAccordion } from "@/components/ui/card-accordion";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

const TIPO_RESOLUCION_OPTIONS: { value: "sancion" | "resumen_ap"; label: string }[] = [
  { value: "sancion", label: "Sanción" },
  { value: "resumen_ap", label: "Resumen AP" },
];

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CO");
}

function labelTipoResolucion(value: string | null | undefined): string {
  if (!value) return "—";
  return TIPO_RESOLUCION_OPTIONS.find((o) => o.value === value)?.label ?? value;
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
    >
        {orden && !showForm ? (
          <div className="space-y-2">
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Nº de resolución</dt>
                <dd className="font-medium">{orden.numeroResolucion}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fecha de resolución</dt>
                <dd>{formatDate(orden.fechaResolucion)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Código infracción</dt>
                <dd>{orden.codigoInfraccion ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tipo de resolución</dt>
                <dd>{labelTipoResolucion(orden.tipoResolucion)}</dd>
              </div>
              {orden.rutaArchivo && orden.nombreOriginal && (
                <div>
                  <dt className="text-muted-foreground">Documento</dt>
                  <dd>
                    <a
                      href={`/api/procesos/${procesoId}/orden-resolucion/documento`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {orden.nombreOriginal}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
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
                <Button type="submit" variant="outline" size="sm" className="text-destructive">
                  Eliminar
                </Button>
              </form>
            </div>
            {deleteState?.error && (
              <p className="text-destructive text-sm" role="alert">
                {deleteState.error}
              </p>
            )}
          </div>
        ) : showForm ? (
          <form action={orden ? updateAction : createAction} className="space-y-4">
            <input type="hidden" name="procesoId" value={procesoId} />
            <div className="grid gap-2">
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
            <div className="grid gap-2">
              <Label htmlFor="fechaResolucion-orden">Fecha de resolución (opcional)</Label>
              <Input
                id="fechaResolucion-orden"
                name="fechaResolucion"
                type="date"
                defaultValue={orden?.fechaResolucion ? String(orden.fechaResolucion).slice(0, 10) : ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="codigoInfraccion-orden">Código infracción (opcional)</Label>
              <Input
                id="codigoInfraccion-orden"
                name="codigoInfraccion"
                type="text"
                defaultValue={orden?.codigoInfraccion ?? ""}
                placeholder="Ej. A01"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tipoResolucion-orden">Tipo de resolución (opcional)</Label>
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
            <div className="grid gap-2">
              <Label htmlFor="archivo-orden">
                {orden?.rutaArchivo ? "Reemplazar documento (opcional)" : "Documento adjunto (opcional)"}
              </Label>
              <FileInputDropzone
                id="archivo-orden"
                name="archivo"
                accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,text/plain"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">{orden ? "Guardar" : "Crear orden"}</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setCreating(false);
                }}
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
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)}>
              Agregar orden de resolución
            </Button>
          </div>
        )}
    </CardSectionAccordion>
  );
}
