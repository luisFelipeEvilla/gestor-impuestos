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
import { TIPOS_DOCUMENTO } from "@/lib/constants/tipo-documento";
import type { EstadoFormContribuyente } from "@/lib/actions/contribuyentes";
import type { Contribuyente } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type ContribuyenteFormProps = {
  action: (
    prev: EstadoFormContribuyente | null,
    formData: FormData
  ) => Promise<EstadoFormContribuyente>;
  initialData?: Contribuyente | null;
  submitLabel: string;
};

export function ContribuyenteForm({
  action,
  initialData,
  submitLabel,
}: ContribuyenteFormProps) {
  const [state, formAction] = useActionState(action, null);
  const isEdit = initialData != null;

  return (
    <form action={formAction} key={initialData?.id ?? "nuevo"}>
      {initialData != null && (
        <input type="hidden" name="id" value={String(initialData.id)} readOnly aria-hidden />
      )}
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Editar contribuyente" : "Nuevo contribuyente"}</CardTitle>
          <CardDescription>
            {isEdit
              ? "Modifica los datos del contribuyente."
              : "Registra una persona o entidad para procesos de cobro (NIT o cédula)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state?.error && (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="tipoDocumento">Tipo de documento</Label>
            <select
              id="tipoDocumento"
              name="tipoDocumento"
              defaultValue={initialData?.tipoDocumento ?? "nit"}
              className={cn(
                "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              )}
              aria-invalid={!!state?.errores?.tipoDocumento}
            >
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nit">NIT / Número de documento</Label>
            <Input
              id="nit"
              name="nit"
              defaultValue={initialData?.nit ?? ""}
              placeholder="Ej. 900123456-1 o 1234567890"
              aria-invalid={!!state?.errores?.nit}
              aria-describedby={state?.errores?.nit ? "nit-error" : undefined}
            />
            {state?.errores?.nit && (
              <p id="nit-error" className="text-destructive text-xs">
                {state.errores.nit[0]}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nombreRazonSocial">Nombre o razón social</Label>
            <Input
              id="nombreRazonSocial"
              name="nombreRazonSocial"
              defaultValue={initialData?.nombreRazonSocial ?? ""}
              placeholder="Nombre completo o razón social"
              aria-invalid={!!state?.errores?.nombreRazonSocial}
              aria-describedby={state?.errores?.nombreRazonSocial ? "nombreRazonSocial-error" : undefined}
            />
            {state?.errores?.nombreRazonSocial && (
              <p id="nombreRazonSocial-error" className="text-destructive text-xs">
                {state.errores.nombreRazonSocial[0]}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="telefono">Teléfono (opcional)</Label>
              <Input
                id="telefono"
                name="telefono"
                type="tel"
                defaultValue={initialData?.telefono ?? ""}
                placeholder="Ej. 3001234567"
                aria-invalid={!!state?.errores?.telefono}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={initialData?.email ?? ""}
                placeholder="contacto@ejemplo.com"
                aria-invalid={!!state?.errores?.email}
              />
              {state?.errores?.email && (
                <p className="text-destructive text-xs">{state.errores.email[0]}</p>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="direccion">Dirección (opcional)</Label>
            <Input
              id="direccion"
              name="direccion"
              defaultValue={initialData?.direccion ?? ""}
              placeholder="Dirección fiscal o de notificación"
              aria-invalid={!!state?.errores?.direccion}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="ciudad">Ciudad (opcional)</Label>
              <Input
                id="ciudad"
                name="ciudad"
                defaultValue={initialData?.ciudad ?? ""}
                placeholder="Ej. Bogotá"
                aria-invalid={!!state?.errores?.ciudad}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="departamento">Departamento (opcional)</Label>
              <Input
                id="departamento"
                name="departamento"
                defaultValue={initialData?.departamento ?? ""}
                placeholder="Ej. Cundinamarca"
                aria-invalid={!!state?.errores?.departamento}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">{submitLabel}</Button>
            <Button type="button" variant="outline" asChild>
              <Link href={initialData ? `/contribuyentes/${initialData.id}` : "/contribuyentes"}>
                Cancelar
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
