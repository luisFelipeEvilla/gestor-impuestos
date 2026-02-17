"use client";

import { Button } from "@/components/ui/button";
import { eliminarCargoEmpresa } from "@/lib/actions/cargos-empresa";

const eliminarAction = async (formData: FormData) => {
  await eliminarCargoEmpresa(formData);
};

export function EliminarCargoButton({ id }: { id: number }) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (
      !confirm(
        "¿Eliminar este cargo? Los empleados que lo tengan asignado quedarán sin cargo."
      )
    ) {
      e.preventDefault();
    }
  };

  return (
    <form action={eliminarAction} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive" size="sm">
        Eliminar
      </Button>
    </form>
  );
}
