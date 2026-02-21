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
import type { EstadoFormPerfil } from "@/lib/actions/perfil";
import { actualizarPerfil } from "@/lib/actions/perfil";

interface PerfilFormProps {
  initialData: { nombre: string; email: string };
}

export function PerfilForm({ initialData }: PerfilFormProps) {
  const [state, formAction] = useActionState(actualizarPerfil, null);

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
          <CardDescription>
            Modifica tu nombre y correo. El cargo lo gestiona un administrador.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state?.error && (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              name="nombre"
              defaultValue={initialData.nombre}
              placeholder="Nombre completo"
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={initialData.email}
              placeholder="usuario@ejemplo.com"
              autoComplete="email"
              aria-invalid={!!state?.errores?.email}
              aria-describedby={state?.errores?.email ? "email-error" : undefined}
            />
            {state?.errores?.email && (
              <p id="email-error" className="text-destructive text-xs">
                {state.errores.email[0]}
              </p>
            )}
          </div>
          <Button type="submit">Guardar cambios</Button>
        </CardContent>
      </Card>
    </form>
  );
}
