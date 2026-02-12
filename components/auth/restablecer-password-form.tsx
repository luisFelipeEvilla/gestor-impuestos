"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  restablecerPassword,
  type ResultadoRestablecer,
} from "@/lib/actions/recuperar-password";

type RestablecerPasswordFormProps = {
  token: string;
};

export function RestablecerPasswordForm({ token }: RestablecerPasswordFormProps) {
  const [state, formAction, isPending] = useActionState<ResultadoRestablecer | null, FormData>(
    restablecerPassword,
    null
  );

  return (
    <form
      action={formAction}
      className="flex w-full max-w-sm flex-col gap-4"
      noValidate
    >
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          required
          minLength={6}
          disabled={isPending}
          aria-invalid={!!state?.errores?.password}
          aria-describedby={state?.errores?.password ? "password-error" : state ? "resultado-mensaje" : undefined}
        />
        {state?.errores?.password && (
          <p id="password-error" className="text-destructive text-xs" role="alert">
            {state.errores.password[0]}
          </p>
        )}
      </div>
      {state && !state.ok && (
        <p
          id="resultado-mensaje"
          className="text-destructive text-sm"
          role="alert"
        >
          {state.mensaje}
        </p>
      )}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {isPending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
