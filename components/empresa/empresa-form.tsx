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
import type { EstadoFormEmpresa } from "@/lib/actions/empresa";
import { cn } from "@/lib/utils";

type CargoOption = { id: number; nombre: string };

type EmpresaFormData = {
  id: number;
  nombre: string;
  tipoDocumento: "nit" | "cedula";
  numeroDocumento: string;
  direccion: string | null;
  telefonoContacto: string | null;
  numeroContacto: string | null;
  cargoFirmanteActas: string | null;
};

type EmpresaFormProps = {
  action: (prev: EstadoFormEmpresa | null, formData: FormData) => Promise<EstadoFormEmpresa>;
  initialData: EmpresaFormData | null;
  /** Cargos para el selector de firma en actas (ej. Gerente general, Abogado). */
  cargos: CargoOption[];
};

export function EmpresaForm({ action, initialData, cargos }: EmpresaFormProps) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} key={initialData?.id ?? "nuevo"}>
      {initialData != null && (
        <input type="hidden" name="id" value={String(initialData.id)} readOnly aria-hidden />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de la organización</CardTitle>
          <CardDescription>
            Información de tu organización para actas, documentos y contacto con clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {(state?.error || (state?.errores && Object.keys(state.errores).length > 0)) && (
            <div
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm"
              role="alert"
              aria-live="polite"
            >
              <p className="font-medium text-destructive">
                {state?.error ?? "Revisa los campos marcados abajo."}
              </p>
              {state?.errores && Object.keys(state.errores).length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-0.5 text-destructive/90 text-xs">
                  {Object.entries(state.errores).map(([campo, mensajes]) => (
                    <li key={campo}>
                      {campo === "nombre" && "Nombre: "}
                      {campo === "tipoDocumento" && "Tipo de documento: "}
                      {campo === "numeroDocumento" && "Número de documento: "}
                      {campo === "direccion" && "Dirección: "}
                      {campo === "telefonoContacto" && "Teléfono de contacto: "}
                      {campo === "numeroContacto" && "Número de contacto: "}
                      {campo === "cargoFirmanteActas" && "Cargo que firma actas: "}
                      {mensajes?.[0]}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              name="nombre"
              defaultValue={initialData?.nombre ?? ""}
              placeholder="Ej. RR Consultorías SAS"
              required
              aria-invalid={!!state?.errores?.nombre}
            />
            {state?.errores?.nombre && (
              <p className="text-destructive text-xs">{state.errores.nombre[0]}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
                <option value="nit">NIT</option>
                <option value="cedula">Cédula</option>
              </select>
              {state?.errores?.tipoDocumento && (
                <p className="text-destructive text-xs">{state.errores.tipoDocumento[0]}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="numeroDocumento">Número de documento</Label>
              <Input
                id="numeroDocumento"
                name="numeroDocumento"
                defaultValue={initialData?.numeroDocumento ?? ""}
                placeholder="Ej. 900123456-1"
                required
                aria-invalid={!!state?.errores?.numeroDocumento}
              />
              {state?.errores?.numeroDocumento && (
                <p className="text-destructive text-xs">{state.errores.numeroDocumento[0]}</p>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              name="direccion"
              defaultValue={initialData?.direccion ?? ""}
              placeholder="Dirección de la organización"
              aria-invalid={!!state?.errores?.direccion}
            />
            {state?.errores?.direccion && (
              <p className="text-destructive text-xs">{state.errores.direccion[0]}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="telefonoContacto">Teléfono de contacto</Label>
              <Input
                id="telefonoContacto"
                name="telefonoContacto"
                type="tel"
                defaultValue={initialData?.telefonoContacto ?? ""}
                placeholder="Ej. 300 123 4567"
                aria-invalid={!!state?.errores?.telefonoContacto}
              />
              {state?.errores?.telefonoContacto && (
                <p className="text-destructive text-xs">{state.errores.telefonoContacto[0]}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="numeroContacto">Número de contacto (alternativo)</Label>
              <Input
                id="numeroContacto"
                name="numeroContacto"
                type="tel"
                defaultValue={initialData?.numeroContacto ?? ""}
                placeholder="Ej. 601 234 5678"
                aria-invalid={!!state?.errores?.numeroContacto}
              />
              {state?.errores?.numeroContacto && (
                <p className="text-destructive text-xs">{state.errores.numeroContacto[0]}</p>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cargoFirmanteActas">Cargo que firma las actas (PDF)</Label>
            <select
              id="cargoFirmanteActas"
              name="cargoFirmanteActas"
              defaultValue={initialData?.cargoFirmanteActas ?? ""}
              className={cn(
                "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              )}
              aria-invalid={!!state?.errores?.cargoFirmanteActas}
            >
              <option value="">Seleccionar cargo</option>
              {cargos.map((c) => (
                <option key={c.id} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs">
              Aparece en el espacio de firma del PDF del acta (ej. Gerente general).
            </p>
            {state?.errores?.cargoFirmanteActas && (
              <p className="text-destructive text-xs">{state.errores.cargoFirmanteActas[0]}</p>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" aria-label="Guardar configuración de la organización">
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
