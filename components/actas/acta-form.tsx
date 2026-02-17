"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditorContenido } from "./editor-contenido";
import { IntegrantesActa, type IntegranteItem } from "./integrantes-acta";
import { CompromisosActa } from "./compromisos-acta";
import type { EstadoFormActa, CompromisoFormItem } from "@/lib/actions/actas-types";
import { cn } from "@/lib/utils";

type UsuarioOption = { id: number; nombre: string; email: string; cargoNombre?: string | null };
type ClienteOption = { id: number; nombre: string; codigo: string | null };
type ClienteMiembroOption = { id: number; clienteId: number; nombre: string; email: string; cargo: string | null };
type CargoOption = { id: number; nombre: string };
type ObligacionConActividades = {
  id: number;
  descripcion: string;
  orden: number;
  actividades: { id: number; codigo: string; descripcion: string }[];
};

type ActaFormProps = {
  action: (
    prev: EstadoFormActa | null,
    formData: FormData
  ) => Promise<EstadoFormActa>;
  submitLabel: string;
  usuarios: UsuarioOption[];
  clientes: ClienteOption[];
  /** Obligaciones con sus actividades para elegir por obligación. */
  obligacionesConActividades?: ObligacionConActividades[];
  /** Cargos de la empresa para asignar a integrantes internos (ej. Gerente general, Abogado). */
  cargosEmpresa?: CargoOption[];
  /** Miembros de clientes (para asignar compromisos a miembros del cliente). */
  clientesMiembros?: ClienteMiembroOption[];
  initialData?: {
    id?: string;
    fecha: string;
    objetivo: string;
    contenido: string | null;
    compromisos: CompromisoFormItem[];
    integrantes: IntegranteItem[];
    clientesIds?: number[];
    actividadesIds?: number[];
  } | null;
};

function formatDateForInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "" : (d as Date).toISOString().slice(0, 10);
}

export function ActaForm({
  action,
  submitLabel,
  usuarios,
  clientes: clientesList,
  obligacionesConActividades = [],
  cargosEmpresa = [],
  clientesMiembros = [],
  initialData,
}: ActaFormProps) {
  const [state, formAction] = useActionState(action, null);
  const [integrantes, setIntegrantes] = useState<IntegranteItem[]>(
    initialData?.integrantes ?? []
  );
  const [compromisos, setCompromisos] = useState<CompromisoFormItem[]>(
    initialData?.compromisos ?? []
  );
  const [clientesIds, setClientesIds] = useState<number[]>(
    initialData?.clientesIds ?? []
  );
  const [actividadesIds, setActividadesIds] = useState<number[]>(
    initialData?.actividadesIds ?? []
  );
  const primeraObligacionId =
    obligacionesConActividades.find((o) => o.actividades.length > 0)?.id ??
    obligacionesConActividades[0]?.id ??
    null;
  const [obligacionSeleccionadaId, setObligacionSeleccionadaId] = useState<number | null>(
    primeraObligacionId
  );
  const actividadesDeLaObligacion =
    obligacionesConActividades.find((o) => o.id === obligacionSeleccionadaId)?.actividades ?? [];

  const handleToggleCliente = (clienteId: number) => {
    setClientesIds((prev) =>
      prev.includes(clienteId)
        ? prev.filter((id) => id !== clienteId)
        : [...prev, clienteId]
    );
  };

  const handleToggleActividad = (actividadId: number) => {
    setActividadesIds((prev) =>
      prev.includes(actividadId)
        ? prev.filter((id) => id !== actividadId)
        : [...prev, actividadId]
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const hiddenIntegrantes = form.querySelector('input[name="integrantes"]') as HTMLInputElement | null;
    if (hiddenIntegrantes) hiddenIntegrantes.value = JSON.stringify(integrantes);
    const hiddenCompromisos = form.querySelector('input[name="compromisos"]') as HTMLInputElement | null;
    if (hiddenCompromisos) hiddenCompromisos.value = JSON.stringify(compromisos);
    const hiddenClientes = form.querySelector('input[name="clientesIds"]') as HTMLInputElement | null;
    if (hiddenClientes) hiddenClientes.value = JSON.stringify(clientesIds);
    const hiddenActividades = form.querySelector('input[name="actividadesIds"]') as HTMLInputElement | null;
    if (hiddenActividades) hiddenActividades.value = JSON.stringify(actividadesIds);
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-6">
      {state?.error && (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      )}
      {initialData?.id != null && (
        <input type="hidden" name="id" value={String(initialData.id)} readOnly aria-hidden />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Objetivo y contenido</CardTitle>
          <CardDescription>
            Fecha, objetivo de la reunión y desarrollo o notas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                name="fecha"
                type="date"
                defaultValue={initialData?.fecha ?? formatDateForInput(new Date())}
                required
                className={cn(
                  "border-input bg-transparent focus-visible:ring-ring h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2"
                )}
                aria-invalid={!!state?.errores?.fecha}
              />
              {state?.errores?.fecha && (
                <p className="text-destructive text-xs">{state.errores.fecha[0]}</p>
              )}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="objetivo">Objetivo específico</Label>
              <Input
                id="objetivo"
                name="objetivo"
                defaultValue={initialData?.objetivo ?? ""}
                placeholder="Objetivo de la reunión"
                required
                className={cn(
                  "border-input bg-transparent focus-visible:ring-ring h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2"
                )}
                aria-invalid={!!state?.errores?.objetivo}
              />
              {state?.errores?.objetivo && (
                <p className="text-destructive text-xs">{state.errores.objetivo[0]}</p>
              )}
            </div>
          </div>
          <EditorContenido
            name="contenido"
            defaultValue={initialData?.contenido ?? ""}
            aria-invalid={!!state?.errores?.contenido}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participantes</CardTitle>
          <CardDescription>
            Clientes que participan en el acta y asistentes de la reunión (internos y externos).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="space-y-2">
            <Label>Clientes que participan en el acta</Label>
            <p className="text-muted-foreground text-sm">
              Selecciona uno o más clientes. Después podrás agregar asistentes.
            </p>
            {clientesList.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay clientes activos. Crea uno en Clientes.</p>
            ) : (
              <ul className="flex flex-wrap gap-3" role="list">
                {clientesList.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`cliente-${c.id}`}
                      checked={clientesIds.includes(c.id)}
                      onChange={() => handleToggleCliente(c.id)}
                      className="h-4 w-4 rounded border-input"
                      aria-label={`Asociar ${c.nombre}`}
                    />
                    <Label htmlFor={`cliente-${c.id}`} className="font-normal cursor-pointer">
                      {c.codigo ? `${c.codigo} – ` : ""}{c.nombre}
                    </Label>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <input type="hidden" name="clientesIds" value="" readOnly aria-hidden />

          <div
            className={cn(
              "space-y-3 transition-opacity",
              clientesIds.length === 0 && "opacity-60 pointer-events-none"
            )}
            aria-disabled={clientesIds.length === 0}
          >
            {clientesIds.length === 0 && (
              <p className="text-muted-foreground text-sm font-medium">
                Selecciona al menos un cliente arriba para desbloquear los asistentes.
              </p>
            )}
            <IntegrantesActa
              integrantes={integrantes}
              usuarios={usuarios}
              cargosEmpresa={cargosEmpresa}
              clientesMiembros={clientesMiembros}
              clientesIds={clientesIds}
              onChange={setIntegrantes}
              disabled={clientesIds.length === 0}
            />
          </div>
        </CardContent>
      </Card>
      <input type="hidden" name="integrantes" value="" readOnly aria-hidden />

      {obligacionesConActividades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Actividades desarrolladas</CardTitle>
            <CardDescription>
              Elige la obligación y marca las actividades que se desarrollaron en esta reunión. Puedes cambiar de obligación y agregar actividades de varias.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="obligacion-select">Obligación</Label>
              <select
                id="obligacion-select"
                value={obligacionSeleccionadaId ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setObligacionSeleccionadaId(v ? Number(v) : null);
                }}
                className="border-input bg-transparent focus-visible:ring-ring flex h-9 w-full max-w-xl rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2"
                aria-label="Seleccionar obligación"
              >
                <option value="">Seleccione una obligación</option>
                {obligacionesConActividades.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id === 0 ? o.descripcion : `${o.orden}. ${o.descripcion}`}
                  </option>
                ))}
              </select>
            </div>
            {obligacionSeleccionadaId != null && actividadesDeLaObligacion.length > 0 && (
              <div className="space-y-2">
                <Label>Actividades de esta obligación</Label>
                <ul className="space-y-3" role="list">
                  {actividadesDeLaObligacion.map((a) => (
                    <li key={a.id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id={`actividad-${a.id}`}
                        checked={actividadesIds.includes(a.id)}
                        onChange={() => handleToggleActividad(a.id)}
                        className="mt-1 h-4 w-4 rounded border-input shrink-0"
                        aria-label={a.descripcion.length > 60 ? `Actividad ${a.codigo}: ${a.descripcion.slice(0, 60)}…` : `Actividad ${a.codigo}: ${a.descripcion}`}
                      />
                      <Label htmlFor={`actividad-${a.id}`} className="font-normal cursor-pointer text-sm leading-snug">
                        <span className="font-medium text-foreground">{a.codigo}</span>
                        {" — "}
                        {a.descripcion}
                      </Label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {obligacionSeleccionadaId != null && actividadesDeLaObligacion.length === 0 && (
              <p className="text-muted-foreground text-sm">Esta obligación no tiene actividades en el catálogo.</p>
            )}
            {actividadesIds.length > 0 && (
              <p className="text-muted-foreground text-xs">
                Total seleccionadas: {actividadesIds.length} actividad{actividadesIds.length !== 1 ? "es" : ""}.
              </p>
            )}
            <input type="hidden" name="actividadesIds" value="" readOnly aria-hidden />
          </CardContent>
        </Card>
      )}

      <Card
        className={cn(
          "transition-opacity",
          integrantes.length === 0 && "opacity-60 pointer-events-none"
        )}
        aria-disabled={integrantes.length === 0}
      >
        <CardHeader>
          <CardTitle>Compromisos</CardTitle>
          <CardDescription>
            {integrantes.length === 0
              ? "Agrega al menos un asistente en la card de Participantes para desbloquear esta sección."
              : "Registra los compromisos pactados y asigna responsables."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompromisosActa
            compromisos={compromisos}
            integrantes={integrantes.map((i) => ({ nombre: i.nombre, email: i.email }))}
            clientesMiembros={clientesMiembros}
            clientesIds={clientesIds}
            onChange={setCompromisos}
            disabled={integrantes.length === 0}
          />
        </CardContent>
      </Card>
      <input type="hidden" name="compromisos" value="" readOnly aria-hidden />

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
