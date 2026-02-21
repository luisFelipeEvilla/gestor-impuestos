"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmarEliminacionModal } from "@/components/confirmar-eliminacion-modal";
import { eliminarImpuesto, desactivarImpuesto, activarImpuesto } from "@/lib/actions/impuestos";

const eliminarAction = async (formData: FormData) => {
  await eliminarImpuesto(formData);
};

const desactivarAction = async (formData: FormData) => {
  await desactivarImpuesto(formData);
};

const activarAction = async (formData: FormData) => {
  await activarImpuesto(formData);
};

export function EliminarImpuestoButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmandoRef = useRef(false);

  return (
    <>
      <ConfirmarEliminacionModal
        open={open}
        onOpenChange={setOpen}
        title="Eliminar impuesto"
        description="No se puede deshacer. Si hay procesos asociados, la acción fallará."
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

export function DesactivarImpuestoButton({ id }: { id: string }) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm("¿Desactivar este impuesto? No aparecerá en el listado de activos ni en nuevos procesos.")) {
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

export function ActivarImpuestoButton({ id }: { id: string }) {
  return (
    <form action={activarAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="secondary">
        Activar
      </Button>
    </form>
  );
}
