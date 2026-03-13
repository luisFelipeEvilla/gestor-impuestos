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
import type { EstadoFormVehiculo } from "@/lib/actions/vehiculos";
import type { Vehiculo } from "@/lib/db/schema";

type ContribuyenteOption = {
  id: number;
  nit: string;
  nombreRazonSocial: string;
};

type VehiculoFormProps = {
  action: (
    prev: EstadoFormVehiculo | null,
    formData: FormData
  ) => Promise<EstadoFormVehiculo>;
  initialData?: Vehiculo | null;
  submitLabel: string;
  /** Contribuyente ya vinculado (solo para edit). */
  contribuyenteActual?: ContribuyenteOption | null;
};

const CLASES = ["AUTOMOVIL", "CAMIONETA", "CAMPERO", "CAMION", "BUS", "BUSETA", "MICROBUS", "MOTOCICLETA", "MOTOCARGUERO", "CUATRIMOTO", "MAQUINARIA AGRICOLA", "OTRO"];

export function VehiculoForm({
  action,
  initialData,
  submitLabel,
  contribuyenteActual,
}: VehiculoFormProps) {
  const [state, formAction] = useActionState(action, null);
  const isEdit = initialData != null;

  return (
    <form action={formAction} key={initialData?.id ?? "nuevo"}>
      {isEdit && (
        <input type="hidden" name="id" value={String(initialData!.id)} readOnly aria-hidden />
      )}
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Editar vehículo" : "Nuevo vehículo"}</CardTitle>
          <CardDescription>
            {isEdit
              ? "Modifica los datos del vehículo."
              : "Registra un vehículo asociado a un contribuyente."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state?.error && (
            <p className="text-destructive text-sm" role="alert">{state.error}</p>
          )}

          {/* Contribuyente */}
          {isEdit && contribuyenteActual ? (
            <div className="grid gap-2">
              <Label>Propietario (contribuyente)</Label>
              <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">{contribuyenteActual.nombreRazonSocial}</span>
                <span className="ml-2 text-muted-foreground text-xs">{contribuyenteActual.nit}</span>
              </div>
              <input
                type="hidden"
                name="contribuyenteId"
                value={String(contribuyenteActual.id)}
              />
              <p className="text-xs text-muted-foreground">
                Para cambiar el propietario, elimina este vehículo y créalo de nuevo.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="contribuyenteId">
                ID del contribuyente <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contribuyenteId"
                name="contribuyenteId"
                type="number"
                placeholder="Ej. 42"
                aria-invalid={!!state?.errores?.contribuyenteId}
              />
              {state?.errores?.contribuyenteId && (
                <p className="text-destructive text-xs">{state.errores.contribuyenteId[0]}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Puedes encontrar el ID en el{" "}
                <Link href="/contribuyentes" target="_blank" className="text-primary hover:underline">
                  listado de contribuyentes
                </Link>.
              </p>
            </div>
          )}

          {/* Placa */}
          <div className="grid gap-2">
            <Label htmlFor="placa">
              Placa <span className="text-destructive">*</span>
            </Label>
            <Input
              id="placa"
              name="placa"
              defaultValue={initialData?.placa ?? ""}
              placeholder="Ej. ABC123"
              className="font-mono uppercase"
              maxLength={20}
              aria-invalid={!!state?.errores?.placa}
            />
            {state?.errores?.placa && (
              <p className="text-destructive text-xs">{state.errores.placa[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Clase */}
            <div className="grid gap-2">
              <Label htmlFor="clase">Clase</Label>
              <select
                id="clase"
                name="clase"
                defaultValue={initialData?.clase ?? ""}
                className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              >
                <option value="">Seleccionar...</option>
                {CLASES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Modelo */}
            <div className="grid gap-2">
              <Label htmlFor="modelo">Año modelo</Label>
              <Input
                id="modelo"
                name="modelo"
                type="number"
                min={1900}
                max={2100}
                defaultValue={initialData?.modelo ?? ""}
                placeholder="Ej. 2018"
                aria-invalid={!!state?.errores?.modelo}
              />
              {state?.errores?.modelo && (
                <p className="text-destructive text-xs">{state.errores.modelo[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Marca */}
            <div className="grid gap-2">
              <Label htmlFor="marca">Marca</Label>
              <Input
                id="marca"
                name="marca"
                defaultValue={initialData?.marca ?? ""}
                placeholder="Ej. Chevrolet"
                maxLength={100}
              />
            </div>

            {/* Cilindraje */}
            <div className="grid gap-2">
              <Label htmlFor="cilindraje">Cilindraje (cc)</Label>
              <Input
                id="cilindraje"
                name="cilindraje"
                type="number"
                min={0}
                defaultValue={initialData?.cilindraje ?? ""}
                placeholder="Ej. 1400"
              />
            </div>
          </div>

          {/* Línea */}
          <div className="grid gap-2">
            <Label htmlFor="linea">Línea / Referencia</Label>
            <Input
              id="linea"
              name="linea"
              defaultValue={initialData?.linea ?? ""}
              placeholder="Ej. Spark (Línea base estándar)"
              maxLength={200}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit">{submitLabel}</Button>
            <Button type="button" variant="outline" asChild>
              <Link href={isEdit ? `/vehiculos/${initialData!.id}` : "/vehiculos"}>
                Cancelar
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
