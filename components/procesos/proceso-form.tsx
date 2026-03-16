"use client";

import { useActionState, useState } from "react";
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
import { ContribuyenteSelector } from "./contribuyente-selector";
import { VehiculoSelector } from "./vehiculo-selector";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "asignado", label: "Asignado" },
  { value: "facturacion", label: "Facturación" },
  { value: "acuerdo_pago", label: "Acuerdo de pago" },
  { value: "en_cobro_coactivo", label: "Cobro coactivo" },
  { value: "finalizado", label: "Finalizado" },
] as const;

type UsuarioOption = { id: number; nombre: string };

type ProcesoFormProps = {
  action: (prev: EstadoFormProceso | null, formData: FormData) => Promise<EstadoFormProceso>;
  initialData?: Proceso | null;
  submitLabel: string;
  usuarios: UsuarioOption[];
  /** Label inicial del contribuyente (solo para edición, evita refetch) */
  initialContribuyenteLabel?: string | null;
  /** Label inicial del vehículo (solo para edición, evita refetch) */
  initialVehiculoLabel?: string | null;
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
  usuarios: usuariosList,
  initialContribuyenteLabel,
  initialVehiculoLabel,
}: ProcesoFormProps) {
  const [state, formAction] = useActionState(action, null);
  const isEdit = initialData != null;

  const [contribuyenteId, setContribuyenteId] = useState<number | null>(
    initialData?.contribuyenteId ?? null
  );
  const [vehiculoId, setVehiculoId] = useState<number | null>(
    initialData?.vehiculoId ?? null
  );

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
              : "Registra un nuevo proceso de cobro."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state?.error && (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          )}
          <div className="grid gap-2">
            <Label>Contribuyente</Label>
            <ContribuyenteSelector
              value={contribuyenteId}
              initialLabel={initialContribuyenteLabel}
              onChange={(id) => setContribuyenteId(id)}
            />
            {state?.errores?.contribuyenteId && (
              <p className="text-destructive text-xs">{state.errores.contribuyenteId[0]}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Vehículo (placa, opcional)</Label>
            <VehiculoSelector
              value={vehiculoId}
              initialLabel={initialVehiculoLabel}
              onChange={(id) => setVehiculoId(id)}
            />
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
            <Label htmlFor="noComparendo">No. comparendo (opcional)</Label>
            <Input
              id="noComparendo"
              name="noComparendo"
              defaultValue={initialData?.noComparendo ?? ""}
              placeholder="Ej. 123456789"
              aria-invalid={!!state?.errores?.noComparendo}
            />
            {state?.errores?.noComparendo && (
              <p className="text-destructive text-xs">{state.errores.noComparendo[0]}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="montoCop">Monto total (COP)</Label>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="montoMultaCop">Multa (COP, opcional)</Label>
              <Input
                id="montoMultaCop"
                name="montoMultaCop"
                type="text"
                inputMode="decimal"
                defaultValue={initialData?.montoMultaCop ?? ""}
                placeholder="Ej. 1000000"
                aria-invalid={!!state?.errores?.montoMultaCop}
              />
              {state?.errores?.montoMultaCop && (
                <p className="text-destructive text-xs">{state.errores.montoMultaCop[0]}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="montoInteresesCop">Intereses (COP, opcional)</Label>
              <Input
                id="montoInteresesCop"
                name="montoInteresesCop"
                type="text"
                inputMode="decimal"
                defaultValue={initialData?.montoInteresesCop ?? ""}
                placeholder="Ej. 500000"
                aria-invalid={!!state?.errores?.montoInteresesCop}
              />
              {state?.errores?.montoInteresesCop && (
                <p className="text-destructive text-xs">{state.errores.montoInteresesCop[0]}</p>
              )}
            </div>
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
              aria-describedby="fechaLimite-hint"
            />
            <p id="fechaLimite-hint" className="text-muted-foreground text-xs">
              Se calcula en 3 años desde la fecha de aplicación del impuesto. Si el proceso pasa a cobro coactivo, se recalcula desde esa fecha.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fechaAplicacionImpuesto">Fecha creación/aplicación del impuesto (opcional)</Label>
              <Input
                id="fechaAplicacionImpuesto"
                name="fechaAplicacionImpuesto"
                type="date"
                defaultValue={formatDateForInput(initialData?.fechaAplicacionImpuesto)}
                aria-invalid={!!state?.errores?.fechaAplicacionImpuesto}
                aria-describedby="fechaAplicacion-hint"
              />
              <p id="fechaAplicacion-hint" className="text-muted-foreground text-xs">
                Si se indica, la fecha límite se calcula automáticamente (3 años desde esta fecha).
              </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">{submitLabel}</Button>
            <Button type="button" variant="outline" asChild>
              <Link href={initialData ? `/comparendos/${initialData.id}` : "/comparendos"}>
                Cancelar
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
