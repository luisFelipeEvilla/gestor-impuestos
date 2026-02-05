"use client";

import { Button } from "@/components/ui/button";
import {
  eliminarUsuario,
  desactivarUsuario,
  activarUsuario,
} from "@/lib/actions/usuarios";

const eliminarAction = async (formData: FormData) => {
  await eliminarUsuario(formData);
};

const desactivarAction = async (formData: FormData) => {
  await desactivarUsuario(formData);
};

const activarAction = async (formData: FormData) => {
  await activarUsuario(formData);
};

export function EliminarUsuarioButton({ id }: { id: number }) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (
      !confirm(
        "¿Eliminar este usuario? No se puede deshacer. Los procesos asignados quedarán sin asignar."
      )
    ) {
      e.preventDefault();
    }
  };

  return (
    <form action={eliminarAction} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive">
        Eliminar
      </Button>
    </form>
  );
}

export function DesactivarUsuarioButton({ id }: { id: number }) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (
      !confirm(
        "¿Desactivar este usuario? No podrá iniciar sesión hasta que se reactive."
      )
    ) {
      e.preventDefault();
    }
  };

  return (
    <form action={desactivarAction} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="secondary">
        Desactivar
      </Button>
    </form>
  );
}

export function ActivarUsuarioButton({ id }: { id: number }) {
  return (
    <form action={activarAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="secondary">
        Activar
      </Button>
    </form>
  );
}
