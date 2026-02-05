"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cambiarEstadoProceso,
  asignarProceso,
  agregarNotaProceso,
  enviarNotificacionPorCorreo,
  enviarNotificacionPorMensaje,
} from "@/lib/actions/procesos";
import { cn } from "@/lib/utils";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "asignado", label: "Asignado" },
  { value: "notificado", label: "Notificado" },
  { value: "en_negociacion", label: "En negociación" },
  { value: "cobrado", label: "Cobrado" },
  { value: "incobrable", label: "Incobrable" },
  { value: "en_cobro_coactivo", label: "En cobro coactivo" },
  { value: "suspendido", label: "Suspendido" },
] as const;

type UsuarioOption = { id: number; nombre: string };

type CambiarEstadoFormProps = {
  procesoId: number;
  estadoActual: string;
};

export function CambiarEstadoForm({ procesoId, estadoActual }: CambiarEstadoFormProps) {
  const [state, formAction] = useActionState(cambiarEstadoProceso, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="procesoId" value={procesoId} />
      <div className="grid gap-1.5">
        <Label htmlFor="estadoActual-gestion" className="text-xs">
          Nuevo estado
        </Label>
        <select
          id="estadoActual-gestion"
          name="estadoActual"
          defaultValue={estadoActual}
          className={cn(
            "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] min-w-[180px]"
          )}
          aria-label="Seleccionar nuevo estado"
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="comentario-estado" className="text-xs">
          Comentario (opcional)
        </Label>
        <Input
          id="comentario-estado"
          name="comentario"
          type="text"
          placeholder="Ej. Llamada realizada"
          className="h-9 w-48"
        />
      </div>
      <Button type="submit" size="sm">
        Cambiar estado
      </Button>
      {state?.error && (
        <p className="text-destructive text-xs w-full" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

type AsignarProcesoFormProps = {
  procesoId: number;
  asignadoAId: number | null;
  usuarios: UsuarioOption[];
};

export function AsignarProcesoForm({
  procesoId,
  asignadoAId,
  usuarios,
}: AsignarProcesoFormProps) {
  const [state, formAction] = useActionState(asignarProceso, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="procesoId" value={procesoId} />
      <div className="grid gap-1.5">
        <Label htmlFor="asignadoAId-gestion" className="text-xs">
          Asignar a
        </Label>
        <select
          id="asignadoAId-gestion"
          name="asignadoAId"
          defaultValue={asignadoAId ?? ""}
          className={cn(
            "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] min-w-[200px]"
          )}
          aria-label="Seleccionar usuario"
        >
          <option value="">Sin asignar</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm">
        Asignar
      </Button>
      {state?.error && (
        <p className="text-destructive text-xs w-full" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

type AgregarNotaFormProps = {
  procesoId: number;
};

export function AgregarNotaForm({ procesoId }: AgregarNotaFormProps) {
  const [state, formAction] = useActionState(agregarNotaProceso, null);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="procesoId" value={procesoId} />
      <div className="grid gap-1.5">
        <Label htmlFor="comentario-nota" className="text-xs">
          Nueva nota
        </Label>
        <Input
          id="comentario-nota"
          name="comentario"
          type="text"
          placeholder="Ej. El contribuyente solicita plan de pagos"
          className="w-full max-w-md"
          required
          aria-invalid={!!state?.error}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">
          Agregar nota
        </Button>
        {state?.error && (
          <p className="text-destructive text-xs" role="alert">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}

type BotonesNotificacionProps = {
  procesoId: number;
};

export function BotonesNotificacion({ procesoId }: BotonesNotificacionProps) {
  const [stateCorreo, formActionCorreo] = useActionState(
    (_prev: { error?: string } | null, formData: FormData) => enviarNotificacionPorCorreo(formData),
    null
  );
  const [stateMensaje, formActionMensaje] = useActionState(
    (_prev: { error?: string } | null, formData: FormData) => enviarNotificacionPorMensaje(formData),
    null
  );

  return (
    <div className="flex  flex-col justify-center gap-2">
      <form action={formActionCorreo}>
        <input type="hidden" name="procesoId" value={procesoId} />
        <Button type="submit" size="sm" variant="outline" aria-label="Enviar notificación por correo electrónico">
          Enviar notificación por Correo
        </Button>
      </form>
      <form action={formActionMensaje}>
        <input type="hidden" name="procesoId" value={procesoId} />
        <Button type="submit" size="sm" variant="outline" aria-label="Enviar notificación por mensaje de texto">
          Enviar notificación por SMS
        </Button>
      </form>
      {(stateCorreo?.error || stateMensaje?.error) && (
        <p className="text-destructive text-xs w-full" role="alert">
          {stateCorreo?.error ?? stateMensaje?.error}
        </p>
      )}
    </div>
  );
}
