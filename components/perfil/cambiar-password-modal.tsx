"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { cambiarContraseña } from "@/lib/actions/perfil";

interface CambiarPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CambiarPasswordForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(cambiarContraseña, null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  useEffect(() => {
    if (state && !state.error && !state.errores) {
      toast.success("Contraseña actualizada correctamente");
      onSuccess();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      )}
      <div className="grid gap-2">
        <Label htmlFor="modal-password">Nueva contraseña</Label>
        <div className="relative">
          <Input
            id="modal-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            minLength={6}
            required
            aria-invalid={!!state?.errores?.password}
            className={cn("pr-10")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
        </div>
        {state?.errores?.password && (
          <p className="text-destructive text-xs">{state.errores.password[0]}</p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="modal-passwordConfirm">Confirmar contraseña</Label>
        <div className="relative">
          <Input
            id="modal-passwordConfirm"
            name="passwordConfirm"
            type={showPasswordConfirm ? "text" : "password"}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            required
            aria-invalid={!!state?.errores?.passwordConfirm}
            className={cn("pr-10")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => setShowPasswordConfirm((v) => !v)}
            aria-label={
              showPasswordConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            tabIndex={-1}
          >
            {showPasswordConfirm ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
        </div>
        {state?.errores?.passwordConfirm && (
          <p className="text-destructive text-xs">
            {state.errores.passwordConfirm[0]}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit">Cambiar contraseña</Button>
      </DialogFooter>
    </form>
  );
}

export function CambiarPasswordModal({ open, onOpenChange }: CambiarPasswordModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            Ingresa la nueva contraseña y confírmala. Debe tener al menos 6 caracteres.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <CambiarPasswordForm onSuccess={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
