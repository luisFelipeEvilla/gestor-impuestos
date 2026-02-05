"use client";

import { useActionState } from "react";
import Link from "next/link";
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
import type { EstadoFormProceso } from "@/lib/actions/procesos";
import type { Proceso } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "asignado", label: "Asignado" },
  { value: "notificado", label: "Notificado" },
  { value: "en_negociacion", label: "En negociación" },
  { value: "cobrado", label: "Cobrado" },
  { value: "incobrable", label: "Incobrable" },
  { value: "en_cobro_coactivo", label: "En cobro coactivo" },
  { value: "suspendido", label: "Suspendido" },
] as const;

type ImpuestoOption = { id: number; nombre: string; codigo: string };
type ContribuyenteOption = { id: number; nit: string; nombreRazonSocial: string };
type UsuarioOption = { id: number; nombre: string };

type ProcesoFormProps = {
  action: (prev: EstadoFormProceso | null, formData: FormData) => Promise<EstadoFormProceso>;
  initialData?: Proceso | null;
  submitLabel: string;
  impuestos: ImpuestoOption[];
  contribuyentes: ContribuyenteOption[];
  usuarios: UsuarioOption[];
};

function formatDateForInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function ProcesoForm({
  action,
  initialData,
  submitLabel,
  impuestos: impuestosList,
  contribuyentes: contribuyentesList,
  usuarios: usuariosList,
}: ProcesoFormProps) {
  const [state, formAction] = useActionState(action, null);
  const isEdit = initialData != null;

  return (
    <form action={formAction} key={initialData?.id ?? "nuevo"}>
      {initialData != null && (
        <input type="hidden" name="id" value={String(initialData.id)} readOnly aria-hidden />
      )}
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Editar proceso" : "Nuevo proceso"}</CardTitle>
          <CardDescription>
            {isEdit
              ? "Modifica los datos del proceso de cobro."
              : "Registra un nuevo proceso de cobro (impuesto + contribuyente)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state?.error && (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="impuestoId">Impuesto</Label>
            <select
              id="impuestoId"
              name="impuestoId"
              defaultValue={initialData?.impuestoId ?? ""}
              className={cn(
                "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              )}
              aria-invalid={!!state?.errores?.impuestoId}
              aria-required="true"
            >
              <option value="">Selecciona un impuesto</option>
              {impuestosList.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.codigo} – {i.nombre}
                </option>
              ))}
            </select>
            {state?.errores?.impuestoId && (
              <p className="text-destructive text-xs">{state.errores.impuestoId[0]}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contribuyenteId">Contribuyente</Label>
            <select
              id="contribuyenteId"
              name="contribuyenteId"
              defaultValue={initialData?.contribuyenteId ?? ""}
              className={cn(
                "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              )}
              aria-invalid={!!state?.errores?.contribuyenteId}
              aria-required="true"
            >
              <option value="">Selecciona un contribuyente</option>
              {contribuyentesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nit} – {c.nombreRazonSocial}
                </option>
              ))}
            </select>
            {state?.errores?.contribuyenteId && (
              <p className="text-destructive text-xs">{state.errores.contribuyenteId[0]}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="vigencia">Vigencia (año)</Label>
              <Input
                id="vigencia"
                name="vigencia"
                type="number"
                min={2000}
                max={2100}
                defaultValue={initialData?.vigencia ?? new Date().getFullYear()}
                aria-invalid={!!state?.errores?.vigencia}
              />
              {state?.errores?.vigencia && (
                <p className="text-destructive text-xs">{state.errores.vigencia[0]}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="periodo">Período (opcional)</Label>
              <Input
                id="periodo"
                name="periodo"
                defaultValue={initialData?.periodo ?? ""}
                placeholder="Ej. 01-2024"
                aria-invalid={!!state?.errores?.periodo}
              />
              {state?.errores?.periodo && (
                <p className="text-destructive text-xs">{state.errores.periodo[0]}</p>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="montoCop">Monto (COP)</Label>
            <Input
              id="montoCop"
              name="montoCop"
              type="text"
              inputMode="decimal"
              defaultValue={initialData?.montoCop ?? ""}
              placeholder="Ej. 1500000.50"
              aria-invalid={!!state?.errores?.montoCop}
            />
            {state?.errores?.montoCop && (
              <p className="text-destructive text-xs">{state.errores.montoCop[0]}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="estadoActual">Estado</Label>
            <select
              id="estadoActual"
              name="estadoActual"
              defaultValue={initialData?.estadoActual ?? "pendiente"}
              className={cn(
                "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              )}
              aria-invalid={!!state?.errores?.estadoActual}
            >
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="asignadoAId">Asignado a (opcional)</Label>
            <select
              id="asignadoAId"
              name="asignadoAId"
              defaultValue={initialData?.asignadoAId ?? ""}
              className={cn(
                "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              )}
              aria-describedby="asignadoAId-hint"
            >
              <option value="">Sin asignar</option>
              {usuariosList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
            <p id="asignadoAId-hint" className="text-muted-foreground text-xs">
              Puedes asignar al crear; si asignas, el estado quedará en &quot;Asignado&quot;.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fechaLimite">Fecha límite (opcional)</Label>
            <Input
              id="fechaLimite"
              name="fechaLimite"
              type="date"
              defaultValue={formatDateForInput(initialData?.fechaLimite)}
              aria-invalid={!!state?.errores?.fechaLimite}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">{submitLabel}</Button>
            <Button type="button" variant="outline" asChild>
              <Link href={initialData ? `/procesos/${initialData.id}` : "/procesos"}>
                Cancelar
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
