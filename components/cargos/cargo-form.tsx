"use client";

import { useActionState } from "react";
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
import type { EstadoFormCargo } from "@/lib/actions/cargos-empresa";

type CargoConOrden = { id: number; nombre: string; orden: number };

type CargoFormProps = {
  action: (
    prev: EstadoFormCargo | null,
    formData: FormData
  ) => Promise<EstadoFormCargo>;
  initialData?: CargoConOrden | null;
  submitLabel: string;
};

export function CargoForm({
  action,
  initialData,
  submitLabel,
}: CargoFormProps) {
  const [state, formAction] = useActionState(action, null);
  const isEdit = initialData != null;

  return (
    <form action={formAction} key={initialData?.id ?? "nuevo"}>
      {initialData != null && (
        <input
          type="hidden"
          name="id"
          value={String(initialData.id)}
          readOnly
          aria-hidden
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Editar cargo" : "Nuevo cargo"}</CardTitle>
          <CardDescription>
            {isEdit
              ? "Modifica el nombre u orden del cargo."
              : "Define un cargo de la organización (ej. Gerente general, Abogado). Luego podrás asignarlo a los empleados."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state?.error && (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="nombre">Nombre del cargo</Label>
            <Input
              id="nombre"
              name="nombre"
              defaultValue={initialData?.nombre ?? ""}
              placeholder="Ej. Gerente general, Abogado"
              aria-invalid={!!state?.errores?.nombre}
              aria-describedby={
                state?.errores?.nombre ? "nombre-error" : undefined
              }
            />
            {state?.errores?.nombre && (
              <p id="nombre-error" className="text-destructive text-xs">
                {state.errores.nombre[0]}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="orden">Orden (opcional)</Label>
            <Input
              id="orden"
              name="orden"
              type="number"
              min={0}
              defaultValue={initialData?.orden ?? 0}
              aria-invalid={!!state?.errores?.orden}
              aria-describedby={
                state?.errores?.orden ? "orden-error" : undefined
              }
            />
            {state?.errores?.orden && (
              <p id="orden-error" className="text-destructive text-xs">
                {state.errores.orden[0]}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              Define el orden de aparición en listas (menor número primero).
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">{submitLabel}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
