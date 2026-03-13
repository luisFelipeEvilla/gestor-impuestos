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
import type { EstadoFormImpuesto } from "@/lib/actions/impuestos";
import type { Impuesto } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type ContribuyenteOption = { id: number; nit: string; nombreRazonSocial: string };

type ImpuestoFormProps = {
  action: (prev: EstadoFormImpuesto | null, formData: FormData) => Promise<EstadoFormImpuesto>;
  initialData?: Impuesto | null;
  submitLabel: string;
  contribuyentes: ContribuyenteOption[];
};


const ETIQUETAS_PERIODO: Record<string, string> = {
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

const selectClass = cn(
  "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50",
  "h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
);

export function ImpuestoForm({
  action,
  initialData,
  submitLabel,
  contribuyentes: contribuyentesList,
}: ImpuestoFormProps) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} key={initialData?.id ?? "nuevo"}>
      {initialData != null && (
        <input type="hidden" name="id" value={String(initialData.id)} readOnly aria-hidden />
      )}
      <Card>
        <CardHeader>
          <CardTitle>{initialData ? "Editar impuesto" : "Nuevo impuesto"}</CardTitle>
          <CardDescription>
            {initialData
              ? "Modifica los datos del proceso fiscal."
              : "Registra un nuevo proceso fiscal de impuesto."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state?.error && (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          )}

          {/* Contribuyente */}
          <div className="grid gap-2">
            <Label htmlFor="contribuyenteId">Contribuyente</Label>
            <select
              id="contribuyenteId"
              name="contribuyenteId"
              defaultValue={initialData?.contribuyenteId ?? ""}
              className={selectClass}
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

          {/* Tipo de impuesto – fijo vehicular */}
          <input type="hidden" name="tipoImpuesto" value="Vehículos automotores" />

          {/* Vigencia y Tipo periodo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="vigencia">Vigencia (año)</Label>
              <Input
                id="vigencia"
                name="vigencia"
                type="number"
                min={1900}
                max={2100}
                defaultValue={initialData?.vigencia ?? new Date().getFullYear()}
                aria-invalid={!!state?.errores?.vigencia}
              />
              {state?.errores?.vigencia && (
                <p className="text-destructive text-xs">{state.errores.vigencia[0]}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tipoPeriodo">Tipo de período</Label>
              <select
                id="tipoPeriodo"
                name="tipoPeriodo"
                defaultValue={initialData?.tipoPeriodo ?? "anual"}
                className={selectClass}
                aria-invalid={!!state?.errores?.tipoPeriodo}
              >
                {Object.entries(ETIQUETAS_PERIODO).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Período */}
          <div className="grid gap-2">
            <Label htmlFor="periodo">Período (opcional)</Label>
            <Input
              id="periodo"
              name="periodo"
              defaultValue={initialData?.periodo ?? ""}
              placeholder='Ej. "1", "2T", "ANUAL"'
            />
            <p className="text-muted-foreground text-xs">
              Número o descripción del período dentro del año gravable.
            </p>
          </div>

          <hr className="border-border" />
          <p className="text-sm font-medium text-foreground">Liquidación</p>

          {/* Base gravable y tarifa */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="baseGravable">Base gravable (COP)</Label>
              <Input
                id="baseGravable"
                name="baseGravable"
                type="number"
                min={0}
                step="0.01"
                defaultValue={initialData?.baseGravable ?? ""}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tarifa">Tarifa (proporción)</Label>
              <Input
                id="tarifa"
                name="tarifa"
                type="number"
                min={0}
                max={1}
                step="0.0001"
                defaultValue={initialData?.tarifa ?? ""}
                placeholder="Ej. 0.0120"
              />
              <p className="text-muted-foreground text-xs">0.0120 = 1.20 %</p>
            </div>
          </div>

          {/* Impuesto determinado */}
          <div className="grid gap-2">
            <Label htmlFor="impuestoDeterminado">Impuesto determinado (COP)</Label>
            <Input
              id="impuestoDeterminado"
              name="impuestoDeterminado"
              type="number"
              min={0}
              step="0.01"
              defaultValue={initialData?.impuestoDeterminado ?? ""}
              placeholder="0.00"
            />
          </div>

          {/* Intereses, sanciones, descuentos */}
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="intereses">Intereses (COP)</Label>
              <Input
                id="intereses"
                name="intereses"
                type="number"
                min={0}
                step="0.01"
                defaultValue={initialData?.intereses ?? "0"}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sanciones">Sanciones (COP)</Label>
              <Input
                id="sanciones"
                name="sanciones"
                type="number"
                min={0}
                step="0.01"
                defaultValue={initialData?.sanciones ?? "0"}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descuentos">Descuentos (COP)</Label>
              <Input
                id="descuentos"
                name="descuentos"
                type="number"
                min={0}
                step="0.01"
                defaultValue={initialData?.descuentos ?? "0"}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Total a pagar */}
          <div className="grid gap-2">
            <Label htmlFor="totalAPagar">Total a pagar (COP)</Label>
            <Input
              id="totalAPagar"
              name="totalAPagar"
              type="number"
              min={0}
              step="0.01"
              defaultValue={initialData?.totalAPagar ?? ""}
              placeholder="0.00"
            />
          </div>

          <hr className="border-border" />
          <p className="text-sm font-medium text-foreground">Fechas y referencia</p>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
              <Input
                id="fechaVencimiento"
                name="fechaVencimiento"
                type="date"
                defaultValue={initialData?.fechaVencimiento ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fechaDeclaracion">Fecha de declaración</Label>
              <Input
                id="fechaDeclaracion"
                name="fechaDeclaracion"
                type="date"
                defaultValue={initialData?.fechaDeclaracion ?? ""}
              />
            </div>
          </div>

          {/* Expediente */}
          <div className="grid gap-2">
            <Label htmlFor="noExpediente">N° de expediente (opcional)</Label>
            <Input
              id="noExpediente"
              name="noExpediente"
              defaultValue={initialData?.noExpediente ?? ""}
              placeholder="Referencia externa o número de radicado"
            />
          </div>

          {/* Observaciones */}
          <div className="grid gap-2">
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <textarea
              id="observaciones"
              name="observaciones"
              rows={3}
              defaultValue={initialData?.observaciones ?? ""}
              placeholder="Notas o comentarios adicionales"
              className={cn(
                "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50",
                "w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] resize-none"
              )}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit">{submitLabel}</Button>
            <Button type="button" variant="outline" asChild>
              <Link href={initialData ? `/impuestos/${initialData.id}` : "/impuestos"}>
                Cancelar
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
