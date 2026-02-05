"use client";

import { Button } from "@/components/ui/button";
import { eliminarImpuesto, desactivarImpuesto } from "@/lib/actions/impuestos";

const eliminarAction = async (formData: FormData) => {
  await eliminarImpuesto(formData);
};

const desactivarAction = async (formData: FormData) => {
  await desactivarImpuesto(formData);
};

export function EliminarImpuestoButton({ id }: { id: number }) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm("¿Eliminar este impuesto? No se puede deshacer. Si hay procesos asociados, la acción fallará.")) {
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

export function DesactivarImpuestoButton({ id }: { id: number }) {
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
