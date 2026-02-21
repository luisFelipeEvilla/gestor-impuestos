"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmarEliminacionModal } from "@/components/confirmar-eliminacion-modal";
import { eliminarCargoEmpresa } from "@/lib/actions/cargos-empresa";

const eliminarAction = async (formData: FormData) => {
  await eliminarCargoEmpresa(formData);
};

export function EliminarCargoButton({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmandoRef = useRef(false);

  return (
    <>
      <ConfirmarEliminacionModal
        open={open}
        onOpenChange={setOpen}
        title="Eliminar cargo"
        description="Los empleados que lo tengan asignado quedarán sin cargo."
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
        <Button type="submit" variant="destructive" size="sm">
          Eliminar
        </Button>
      </form>
    </>
  );
}
