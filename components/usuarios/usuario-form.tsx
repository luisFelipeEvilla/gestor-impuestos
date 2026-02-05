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
import type { EstadoFormUsuario } from "@/lib/actions/usuarios";
import type { Usuario } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type UsuarioFormProps = {
  action: (prev: EstadoFormUsuario | null, formData: FormData) => Promise<EstadoFormUsuario>;
  initialData?: Usuario | null;
  submitLabel: string;
};

export function UsuarioForm({ action, initialData, submitLabel }: UsuarioFormProps) {
  const [state, formAction] = useActionState(action, null);
  const isEdit = initialData != null;

  return (
    <form action={formAction} key={initialData?.id ?? "nuevo"}>
      {initialData != null && (
        <input type="hidden" name="id" value={String(initialData.id)} readOnly aria-hidden />
      )}
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Editar usuario" : "Nuevo usuario"}</CardTitle>
          <CardDescription>
            {isEdit
              ? "Modifica los datos del usuario."
              : "Registra un nuevo usuario (admin o empleado)."}
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
              defaultValue={initialData?.nombre ?? ""}
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
              defaultValue={initialData?.email ?? ""}
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
          <div className="grid gap-2">
            <Label htmlFor="password">
              Contraseña {isEdit && "(dejar en blanco para no cambiar)"}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={isEdit ? "••••••••" : "Mínimo 6 caracteres"}
              autoComplete={isEdit ? "new-password" : "new-password"}
              minLength={isEdit ? undefined : 6}
              aria-invalid={!!state?.errores?.password}
              aria-describedby={state?.errores?.password ? "password-error" : undefined}
            />
            {state?.errores?.password && (
              <p id="password-error" className="text-destructive text-xs">
                {state.errores.password[0]}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rol">Rol</Label>
            <select
              id="rol"
              name="rol"
              defaultValue={initialData?.rol ?? ""}
              className={cn(
                "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              )}
              aria-invalid={!!state?.errores?.rol}
            >
              <option value="" disabled>
                Selecciona el rol
              </option>
              <option value="admin">Administrador</option>
              <option value="empleado">Empleado</option>
            </select>
            {state?.errores?.rol && (
              <p className="text-destructive text-xs">{state.errores.rol[0]}</p>
            )}
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
              Activo (puede iniciar sesión)
            </Label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit">{submitLabel}</Button>
            <Button type="button" variant="outline" asChild>
              <Link href={initialData ? `/usuarios/${initialData.id}` : "/usuarios"}>
                Cancelar
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
