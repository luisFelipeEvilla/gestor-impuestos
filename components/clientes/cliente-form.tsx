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
import type { EstadoFormCliente } from "@/lib/actions/clientes";
import type { Cliente } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type ClienteFormProps = {
  action: (prev: EstadoFormCliente | null, formData: FormData) => Promise<EstadoFormCliente>;
  initialData?: Cliente | null;
  submitLabel: string;
};

export function ClienteForm({ action, initialData, submitLabel }: ClienteFormProps) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} key={initialData?.id ?? "nuevo"}>
      {initialData != null && (
        <input type="hidden" name="id" value={String(initialData.id)} readOnly aria-hidden />
      )}
      <Card>
        <CardHeader>
          <CardTitle>{initialData ? "Editar cliente" : "Nuevo cliente"}</CardTitle>
          <CardDescription>
            {initialData
              ? "Modifica los datos del cliente."
              : "Registra un nuevo cliente (ej. Secretaría de Tránsito, Secretaría de Hacienda)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state?.error && (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                name="nombre"
                defaultValue={initialData?.nombre ?? ""}
                placeholder="Ej. Secretaría de Tránsito"
                required
                aria-invalid={!!state?.errores?.nombre}
              />
              {state?.errores?.nombre && (
                <p className="text-destructive text-xs">{state.errores.nombre[0]}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="codigo">Código (opcional)</Label>
              <Input
                id="codigo"
                name="codigo"
                defaultValue={initialData?.codigo ?? ""}
                placeholder="Ej. STR"
                aria-invalid={!!state?.errores?.codigo}
              />
              {state?.errores?.codigo && (
                <p className="text-destructive text-xs">{state.errores.codigo[0]}</p>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Input
              id="descripcion"
              name="descripcion"
              defaultValue={initialData?.descripcion ?? ""}
              placeholder="Breve descripción del cliente"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activo"
              name="activo"
              defaultChecked={initialData?.activo ?? true}
              className="h-4 w-4 rounded border-input"
              aria-label="Cliente activo"
            />
            <Label htmlFor="activo" className="font-normal">
              Activo
            </Label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">{submitLabel}</Button>
            <Button type="button" variant="outline" asChild>
              <Link href={initialData ? `/clientes/${initialData.id}` : "/clientes"}>
                Cancelar
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
