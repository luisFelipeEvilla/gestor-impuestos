"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmarEliminacionModal } from "@/components/confirmar-eliminacion-modal";
import { eliminarContribuyente } from "@/lib/actions/contribuyentes";

const eliminarAction = async (formData: FormData) => {
  await eliminarContribuyente(formData);
};

export function EliminarContribuyenteButton({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmandoRef = useRef(false);

  return (
    <>
      <ConfirmarEliminacionModal
        open={open}
        onOpenChange={setOpen}
        title="Eliminar contribuyente"
        description="No se puede deshacer. Si tiene procesos de cobro asociados, la acción fallará."
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
