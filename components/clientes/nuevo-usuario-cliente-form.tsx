"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { crearUsuarioCliente } from "@/lib/actions/usuarios";

type Props = { clienteId: number };

export function NuevoUsuarioClienteForm({ clienteId }: Props) {
  const [state, formAction, isPending] = useActionState(crearUsuarioCliente, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clienteId" value={clienteId} />

      <div className="space-y-1.5">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" required disabled={isPending} />
        {state?.errores?.nombre && (
          <p className="text-destructive text-sm">{state.errores.nombre[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required disabled={isPending} />
        {state?.errores?.email && (
          <p className="text-destructive text-sm">{state.errores.email[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          disabled={isPending}
        />
        {state?.errores?.password && (
          <p className="text-destructive text-sm">{state.errores.password[0]}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="activo"
          name="activo"
          type="checkbox"
          defaultChecked
          disabled={isPending}
          className="h-4 w-4 rounded border-border"
        />
        <Label htmlFor="activo">Activo</Label>
      </div>

      {state?.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Crear usuario
      </Button>
    </form>
  );
}
