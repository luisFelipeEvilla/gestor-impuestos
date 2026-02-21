"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cambiarContraseña } from "@/lib/actions/perfil";
import { KeyRound } from "lucide-react";

export function CambiarContraseñaModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(cambiarContraseña, null);

  useEffect(() => {
    if (state != null && !state.error) {
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button">
          <KeyRound className="size-4" />
          Cambiar contraseña
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Introduce la nueva contraseña (mínimo 6 caracteres).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {state?.error && (
              <p className="text-destructive text-sm" role="alert">
                {state.error}
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="modal-password">Nueva contraseña</Label>
              <Input
                id="modal-password"
                name="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                minLength={6}
                aria-invalid={!!state?.errores?.password}
                aria-describedby={state?.errores?.password ? "modal-password-error" : undefined}
              />
              {state?.errores?.password && (
                <p id="modal-password-error" className="text-destructive text-xs">
                  {state.errores.password[0]}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="modal-passwordConfirm">Confirmar contraseña</Label>
              <Input
                id="modal-passwordConfirm"
                name="passwordConfirm"
                type="password"
                placeholder="Repite la contraseña"
                autoComplete="new-password"
                aria-invalid={!!state?.errores?.passwordConfirm}
                aria-describedby={
                  state?.errores?.passwordConfirm ? "modal-passwordConfirm-error" : undefined
                }
              />
              {state?.errores?.passwordConfirm && (
                <p id="modal-passwordConfirm-error" className="text-destructive text-xs">
                  {state.errores.passwordConfirm[0]}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit">Cambiar contraseña</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
