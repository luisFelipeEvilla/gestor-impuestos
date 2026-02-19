"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, CheckCircle2 } from "lucide-react";
import {
  enviarActaAprobacionAction,
  aprobarActaAction,
  devolverActaABorradorAction,
  enviarActaPorCorreoAction,
  eliminarActaAction,
} from "@/lib/actions/actas";
import type { EstadoGestionActa } from "@/lib/actions/actas-types";

type BotonesActaProps = {
  actaId: string;
  estado: string;
  puedeEditar: boolean;
  puedeEnviarAprobacion: boolean;
  puedeAprobar: boolean;
  puedeDevolverABorrador: boolean;
  puedeEnviarCorreo: boolean;
  puedeEliminar: boolean;
};

export function BotonesActa({
  actaId,
  puedeEditar,
  puedeEnviarAprobacion,
  puedeAprobar,
  puedeDevolverABorrador,
  puedeEnviarCorreo,
  puedeEliminar,
}: BotonesActaProps) {
  const [stateEnvio, formActionEnvio] = useActionState(enviarActaAprobacionAction, null);
  const [stateAprobar, formActionAprobar] = useActionState(aprobarActaAction, null);
  const [stateDevolver, formActionDevolver] = useActionState(devolverActaABorradorAction, null);
  const [stateCorreo, formActionCorreo] = useActionState(enviarActaPorCorreoAction, null);
  const [stateEliminar, formActionEliminar] = useActionState(eliminarActaAction, null);

  const error =
    stateEnvio?.error ??
    stateAprobar?.error ??
    stateDevolver?.error ??
    stateCorreo?.error ??
    stateEliminar?.error;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm" aria-label="Descargar acta en PDF">
        <a
          href={`/api/actas/${actaId}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileDown className="mr-1.5 size-4" />
          Descargar PDF
        </a>
      </Button>
      {puedeEditar && (
        <Button asChild variant="secondary" size="sm">
          <Link href={`/actas/${actaId}/editar`}>Editar</Link>
        </Button>
      )}
      {puedeEnviarAprobacion && (
        <form action={formActionEnvio}>
          <input type="hidden" name="actaId" value={actaId} />
          <Button type="submit" size="sm">
            Enviar a aprobación
          </Button>
        </form>
      )}
      {puedeAprobar && (
        <form action={formActionAprobar}>
          <input type="hidden" name="actaId" value={actaId} />
          <Button type="submit" variant="secondary" size="sm">
            Aprobar
          </Button>
        </form>
      )}
      {puedeDevolverABorrador && (
        <form
          action={formActionDevolver}
          onSubmit={(e) => {
            if (!confirm("¿Devolver este acta a borrador? Podrá editarla de nuevo.")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="actaId" value={actaId} />
          <Button type="submit" variant="outline" size="sm">
            Devolver a borrador
          </Button>
        </form>
      )}
      {puedeEnviarCorreo && (
        <form action={formActionCorreo}>
          <input type="hidden" name="actaId" value={actaId} />
          <EnviarCorreoButton />
        </form>
      )}
      {puedeEliminar && (
        <form
          action={formActionEliminar}
          onSubmit={(e) => {
            if (!confirm("¿Eliminar este acta? No se puede deshacer.")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="actaId" value={actaId} />
          <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
            Eliminar
          </Button>
        </form>
      )}
      {error && (
        <p className="text-destructive text-sm w-full" role="alert">
          {error}
        </p>
      )}
      {stateCorreo !== null && !stateCorreo.error && (
        <p className="flex items-center gap-1.5 text-sm text-green-600 w-full" role="status">
          <CheckCircle2 className="size-4 shrink-0" />
          Correo enviado correctamente a los asistentes.
        </p>
      )}
    </div>
  );
}

function EnviarCorreoButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-1.5 size-4 animate-spin" />
          Enviando correos…
        </>
      ) : (
        "Enviar por correo a asistentes"
      )}
    </Button>
  );
}
