"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmarEliminacionModal } from "@/components/confirmar-eliminacion-modal";
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
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmandoRef = useRef(false);

  return (
    <>
      <ConfirmarEliminacionModal
        open={open}
        onOpenChange={setOpen}
        title="Eliminar usuario"
        description="No se puede deshacer. Los procesos asignados quedarán sin asignar."
        onConfirm={() => {
          confirmandoRef.current = true;
          formRef.current?.requestSubmit();
        }}
      />
      <form
        ref={formRef}
        action={eliminarAction}
        onSubmit={(e) => {
          if (!confirmandoRef.current) {
            e.preventDefault();
            setOpen(true);
            return;
          }
          confirmandoRef.current = false;
        }}
      >
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="destructive">
          Eliminar
        </Button>
      </form>
    </>
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
