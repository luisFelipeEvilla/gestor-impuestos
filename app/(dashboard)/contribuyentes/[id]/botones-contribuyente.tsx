"use client";

import { Button } from "@/components/ui/button";
import { eliminarContribuyente } from "@/lib/actions/contribuyentes";

const eliminarAction = async (formData: FormData) => {
  await eliminarContribuyente(formData);
};

export function EliminarContribuyenteButton({ id }: { id: number }) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (
      !confirm(
        "¿Eliminar este contribuyente? No se puede deshacer. Si tiene procesos de cobro asociados, la acción fallará."
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
