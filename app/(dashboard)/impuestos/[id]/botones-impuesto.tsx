"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmarEliminacionModal } from "@/components/confirmar-eliminacion-modal";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  eliminarImpuesto,
  cambiarEstadoImpuesto,
  agregarNotaImpuesto,
  type EstadoFormImpuesto,
} from "@/lib/actions/impuestos";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "declarado", label: "Declarado" },
  { value: "liquidado", label: "Liquidado" },
  { value: "notificado", label: "Notificado" },
  { value: "en_cobro_coactivo", label: "En cobro coactivo" },
  { value: "pagado", label: "Pagado" },
  { value: "cerrado", label: "Cerrado" },
];

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
        description="No se puede deshacer. El historial asociado también será eliminado."
        onConfirm={() => {
          confirmandoRef.current = true;
          formRef.current?.requestSubmit();
        }}
      />
      <form
        ref={formRef}
        action={async (fd) => { await eliminarImpuesto(fd); }}
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

export function CambiarEstadoImpuestoButton({
  id,
  estadoActual,
}: {
  id: string;
  estadoActual: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(
    async (_: EstadoFormImpuesto | null, formData: FormData) => {
      const result = await cambiarEstadoImpuesto(formData);
      if (!result.error) setOpen(false);
      return result;
    },
    null
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Cambiar estado
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar estado del impuesto</DialogTitle>
          <DialogDescription>
            Selecciona el nuevo estado y opcionalmente agrega un comentario.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-2">
            <Label htmlFor="estado-select">Nuevo estado</Label>
            <select
              id="estado-select"
              name="estado"
              defaultValue={estadoActual}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="comentario-estado">Comentario (opcional)</Label>
            <textarea
              id="comentario-estado"
              name="comentario"
              rows={3}
              placeholder="Motivo del cambio..."
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
            />
          </div>
          {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
          <DialogFooter>
            <Button type="submit">Guardar cambio</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AgregarNotaButton({ id }: { id: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(
    async (_: EstadoFormImpuesto | null, formData: FormData) => {
      const result = await agregarNotaImpuesto(formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    null
  );

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <textarea
        name="comentario"
        rows={3}
        placeholder="Agrega una nota o comentario..."
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
        required
      />
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      {!state?.error && state !== null && (
        <p className="text-sm text-green-600">Nota guardada.</p>
      )}
      <Button type="submit" size="sm" variant="outline">
        Agregar nota
      </Button>
    </form>
  );
}
