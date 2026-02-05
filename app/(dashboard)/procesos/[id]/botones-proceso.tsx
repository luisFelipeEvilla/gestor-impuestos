"use client";

import { Button } from "@/components/ui/button";
import { eliminarProceso } from "@/lib/actions/procesos";

const eliminarAction = async (formData: FormData) => {
  await eliminarProceso(formData);
};

export function EliminarProcesoButton({ id }: { id: number }) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm("¿Eliminar este proceso? Se borrará también el historial. Esta acción no se puede deshacer.")) {
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
