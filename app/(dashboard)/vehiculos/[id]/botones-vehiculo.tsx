"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmarEliminacionModal } from "@/components/confirmar-eliminacion-modal";
import { eliminarVehiculo } from "@/lib/actions/vehiculos";

export function EliminarVehiculoButton({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmandoRef = useRef(false);

  return (
    <>
      <ConfirmarEliminacionModal
        open={open}
        onOpenChange={setOpen}
        title="Eliminar vehículo"
        description="Se eliminarán también los impuestos asociados. Esta acción no se puede deshacer."
        onConfirm={() => {
          confirmandoRef.current = true;
          formRef.current?.requestSubmit();
        }}
      />
      <form
        ref={formRef}
        action={async (fd) => { await eliminarVehiculo(fd); }}
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
        <Button type="submit" variant="destructive">Eliminar</Button>
      </form>
    </>
  );
}
