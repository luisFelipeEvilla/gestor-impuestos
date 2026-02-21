"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmarEliminacionModal } from "@/components/confirmar-eliminacion-modal";
import {
  crearMiembroCliente,
  eliminarMiembroCliente,
  type ClienteMiembroItem,
} from "@/lib/actions/clientes-miembros";

type MiembrosClienteProps = {
  clienteId: number;
  miembros: ClienteMiembroItem[];
};

export function MiembrosCliente({ clienteId, miembros }: MiembrosClienteProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_prev: { error?: string } | null, fd: FormData) => {
      const res = await crearMiembroCliente(clienteId, fd);
      if (!res?.error) router.refresh();
      return res;
    },
    null
  );

  const [openEliminar, setOpenEliminar] = useState(false);
  const [miembroIdAEliminar, setMiembroIdAEliminar] = useState<number | null>(null);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  const handleAbrirEliminar = (id: number) => {
    setErrorEliminar(null);
    setMiembroIdAEliminar(id);
    setOpenEliminar(true);
  };

  const handleConfirmarEliminar = async () => {
    if (miembroIdAEliminar == null) return;
    const res = await eliminarMiembroCliente(miembroIdAEliminar, clienteId);
    if (res?.error) {
      setErrorEliminar(res.error);
      return;
    }
    setOpenEliminar(false);
    setMiembroIdAEliminar(null);
    router.refresh();
  };

  return (
    <Card className="mx-auto max-w-2xl mt-6">
      <ConfirmarEliminacionModal
        open={openEliminar}
        onOpenChange={(open) => {
          setOpenEliminar(open);
          if (!open) setErrorEliminar(null);
        }}
        title="Eliminar miembro"
        description="El miembro dejará de estar asociado a este cliente."
        onConfirm={handleConfirmarEliminar}
      />
      <CardHeader>
        <CardTitle>Miembros del cliente</CardTitle>
        <CardDescription>
          Personas de la empresa del cliente. Se pueden asignar a compromisos en actas asociadas a este cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorEliminar && (
          <p className="text-destructive text-sm" role="alert">
            {errorEliminar}
          </p>
        )}
        <form action={formAction} className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium">Agregar miembro</p>
          {state?.error && (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="miembro-nombre">Nombre</Label>
              <Input
                id="miembro-nombre"
                name="nombre"
                placeholder="Nombre completo"
                required
                className="h-9"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="miembro-email">Correo</Label>
              <Input
                id="miembro-email"
                name="email"
                type="email"
                placeholder="correo@ejemplo.com"
                required
                className="h-9"
              />
            </div>
          </div>
          <div className="grid gap-1.5 sm:max-w-[240px]">
            <Label htmlFor="miembro-cargo">Cargo (opcional)</Label>
            <Input
              id="miembro-cargo"
              name="cargo"
              placeholder="Ej. Gerente, Contador"
              className="h-9"
            />
          </div>
          <Button type="submit" size="sm">
            Agregar miembro
          </Button>
        </form>

        {miembros.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay miembros registrados.</p>
        ) : (
          <ul className="space-y-2" role="list">
            {miembros.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
              >
                <span>
                  <strong>{m.nombre}</strong>
                  <span className="text-muted-foreground ml-1">{m.email}</span>
                  {m.cargo && (
                    <span className="text-muted-foreground ml-1">· {m.cargo}</span>
                  )}
                  {!m.activo && (
                    <span className="ml-1 text-xs text-muted-foreground">(inactivo)</span>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleAbrirEliminar(m.id)}
                  aria-label={`Eliminar ${m.nombre}`}
                >
                  Eliminar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
