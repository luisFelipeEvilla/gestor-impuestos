"use client";

import { useState } from "react";
import { useActionState } from "react";
import { KeyRound } from "lucide-react";
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
import type { Usuario } from "@/lib/db/schema";
import { actualizarPerfil } from "@/lib/actions/perfil";
import { CambiarPasswordModal } from "@/components/perfil/cambiar-password-modal";

type CargoOption = { id: number; nombre: string };

interface PerfilFormProps {
  initialData: Usuario;
  cargos: CargoOption[];
}

export function PerfilForm({ initialData, cargos }: PerfilFormProps) {
  const [state, formAction] = useActionState(actualizarPerfil, null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  return (
    <>
      <form action={formAction}>
        <Card>
          <CardHeader>
            <CardTitle>Configuración del perfil</CardTitle>
            <CardDescription>
              Actualiza tu nombre y correo. El cargo lo asigna un administrador. El nombre en la
              barra superior se actualizará la próxima vez que inicies sesión.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {state?.error && (
              <p className="text-destructive text-sm" role="alert">
                {state.error}
              </p>
            )}
            {state && !state.error && !state.errores && Object.keys(state).length === 0 && (
              <p className="text-muted-foreground text-sm" role="status">
                Perfil actualizado correctamente.
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="perfil-nombre">Nombre</Label>
              <Input
                id="perfil-nombre"
                name="nombre"
                defaultValue={initialData.nombre}
                placeholder="Nombre completo"
                aria-invalid={!!state?.errores?.nombre}
                aria-describedby={state?.errores?.nombre ? "perfil-nombre-error" : undefined}
              />
              {state?.errores?.nombre && (
                <p id="perfil-nombre-error" className="text-destructive text-xs">
                  {state.errores.nombre[0]}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="perfil-email">Email</Label>
              <Input
                id="perfil-email"
                name="email"
                type="email"
                defaultValue={initialData.email}
                placeholder="usuario@ejemplo.com"
                autoComplete="email"
                aria-invalid={!!state?.errores?.email}
                aria-describedby={state?.errores?.email ? "perfil-email-error" : undefined}
              />
              {state?.errores?.email && (
                <p id="perfil-email-error" className="text-destructive text-xs">
                  {state.errores.email[0]}
                </p>
              )}
            </div>
            {cargos.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="perfil-cargo-solo-lectura">Cargo en la compañía</Label>
                <p
                  id="perfil-cargo-solo-lectura"
                  className="text-muted-foreground border-input flex h-9 items-center rounded-md border border-dashed bg-muted/30 px-3 py-1 text-sm"
                  aria-label="Cargo actual (solo consulta, un administrador puede cambiarlo desde Gestión de usuarios)"
                >
                  {initialData.cargoId != null
                    ? cargos.find((c) => c.id === initialData.cargoId)?.nombre ?? "Sin asignar"
                    : "Sin asignar"}
                </p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button type="submit">Guardar cambios</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordModalOpen(true)}
                aria-label="Abrir modal para cambiar contraseña"
              >
                <KeyRound className="size-4" />
                Cambiar contraseña
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
      <CambiarPasswordModal open={passwordModalOpen} onOpenChange={setPasswordModalOpen} />
    </>
  );
}
