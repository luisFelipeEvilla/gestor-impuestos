"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  solicitarRecuperacionPassword,
  type ResultadoSolicitar,
} from "@/lib/actions/recuperar-password";

export function SolicitarRecuperacionForm() {
  const [state, formAction, isPending] = useActionState<ResultadoSolicitar | null, FormData>(
    solicitarRecuperacionPassword,
    null
  );

  return (
    <form
      action={formAction}
      className="flex w-full max-w-sm flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@ejemplo.com"
          required
          disabled={isPending}
          aria-invalid={state?.ok === false}
          aria-describedby={state ? "resultado-mensaje" : undefined}
        />
      </div>
      {state && (
        <p
          id="resultado-mensaje"
          className={`text-sm ${state.ok ? "text-foreground" : "text-destructive"}`}
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
        {isPending ? "Enviando…" : "Enviar enlace"}
      </Button>
    </form>
  );
}
