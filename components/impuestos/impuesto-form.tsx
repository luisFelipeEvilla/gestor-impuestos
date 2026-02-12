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

type ClienteOption = { id: number; nombre: string; codigo: string | null };

type ImpuestoFormProps = {
  action: (prev: EstadoFormImpuesto | null, formData: FormData) => Promise<EstadoFormImpuesto>;
  initialData?: Impuesto | null;
  submitLabel: string;
  clientes: ClienteOption[];
};

export function ImpuestoForm({ action, initialData, submitLabel, clientes: clientesList }: ImpuestoFormProps) {
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
              ? "Modifica los datos del tipo de impuesto."
              : "Registra un nuevo tipo de impuesto en el catálogo."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state?.error && (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="clienteId">Cliente</Label>
            <select
              id="clienteId"
              name="clienteId"
              defaultValue={initialData?.clienteId ?? ""}
              className={cn(
                "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              )}
              aria-invalid={!!state?.errores?.clienteId}
              aria-required="true"
            >
              <option value="">Selecciona un cliente</option>
              {clientesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo ? `${c.codigo} – ` : ""}{c.nombre}
                </option>
              ))}
            </select>
            {state?.errores?.clienteId && (
              <p className="text-destructive text-xs">{state.errores.clienteId[0]}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              name="nombre"
              defaultValue={initialData?.nombre ?? ""}
              placeholder="Ej. Impuesto de Industria y Comercio"
              aria-invalid={!!state?.errores?.nombre}
              aria-describedby={state?.errores?.nombre ? "nombre-error" : undefined}
            />
            {state?.errores?.nombre && (
              <p id="nombre-error" className="text-destructive text-xs">
                {state.errores.nombre[0]}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="codigo">Código</Label>
            <Input
              id="codigo"
              name="codigo"
              defaultValue={initialData?.codigo ?? ""}
              placeholder="Ej. ICA"
              aria-invalid={!!state?.errores?.codigo}
              aria-describedby={state?.errores?.codigo ? "codigo-error" : undefined}
            />
            {state?.errores?.codigo && (
              <p id="codigo-error" className="text-destructive text-xs">
                {state.errores.codigo[0]}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tipo">Tipo</Label>
            <select
              id="tipo"
              name="tipo"
              defaultValue={initialData?.tipo ?? ""}
              className={cn(
                "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              )}
              aria-invalid={!!state?.errores?.tipo}
            >
              <option value="" disabled>
                Selecciona el tipo
              </option>
              <option value="nacional">Nacional</option>
              <option value="municipal">Municipal</option>
            </select>
            {state?.errores?.tipo && (
              <p className="text-destructive text-xs">{state.errores.tipo[0]}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Input
              id="descripcion"
              name="descripcion"
              defaultValue={initialData?.descripcion ?? ""}
              placeholder="Breve descripción del impuesto"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activo"
              name="activo"
              defaultChecked={initialData?.activo ?? true}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="activo" className="font-normal">
              Activo (visible en el catálogo)
            </Label>
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

