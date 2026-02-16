"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cambiarEstadoProceso,
  asignarProceso,
  agregarNotaProceso,
  enviarNotificacion,
} from "@/lib/actions/procesos";
import { cn } from "@/lib/utils";
import {
  ListaDocumentos,
  SubirDocumentoForm,
} from "@/components/procesos/documentos-proceso";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "asignado", label: "Asignado" },
  { value: "notificado", label: "Notificado" },
  { value: "en_contacto", label: "En contacto" },
  { value: "en_negociacion", label: "En negociación" },
  { value: "cobrado", label: "Cobrado" },
  { value: "incobrable", label: "Incobrable" },
  { value: "en_cobro_coactivo", label: "En cobro coactivo" },
  { value: "suspendido", label: "Suspendido" },
] as const;

/** Desde estos estados no se puede pasar a Cobrado (solo desde En contacto se marca pago). */
const ESTADOS_SIN_COBRADO = ["en_negociacion", "en_cobro_coactivo"];

type UsuarioOption = { id: number; nombre: string };

type CambiarEstadoFormProps = {
  procesoId: number;
  estadoActual: string;
};

export function CambiarEstadoForm({ procesoId, estadoActual }: CambiarEstadoFormProps) {
  const [state, formAction] = useActionState(cambiarEstadoProceso, null);
  const noPuedeCobrado = ESTADOS_SIN_COBRADO.includes(estadoActual);
  const opcionesEstado = noPuedeCobrado
    ? ESTADOS.filter((e) => e.value !== "cobrado")
    : ESTADOS;

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
          {opcionesEstado.map((e) => (
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

export type CategoriaNota = "general" | "en_contacto" | "acuerdo_pago" | "cobro_coactivo";

type AgregarNotaFormProps = {
  procesoId: number;
  /** Categoría de la nota: general, en_contacto, acuerdo_pago, cobro_coactivo */
  categoria: CategoriaNota;
};

export function AgregarNotaForm({ procesoId, categoria }: AgregarNotaFormProps) {
  const [state, formAction] = useActionState(agregarNotaProceso, null);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="procesoId" value={procesoId} />
      <input type="hidden" name="categoria" value={categoria} />
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

export type DocumentoEvidenciaItem = { id: number; nombreOriginal: string };

type BotonesNotificacionProps = {
  procesoId: number;
  yaNotificado: boolean;
  fechaNotificacion?: Date | string | null;
  /** Metadata del evento de notificación (tipo "fisica" | email) y documentoIds si es física */
  notificacionMetadata?: { tipo?: string; documentoIds?: number[] } | null;
  /** Documentos de evidencia cuando la notificación fue física (para mostrar enlaces) */
  documentosEvidencia?: DocumentoEvidenciaItem[];
};

function formatFechaNotificacion(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

const ACCEPT_ARCHIVOS =
  ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv";

export function BotonesNotificacion({
  procesoId,
  yaNotificado,
  fechaNotificacion,
  notificacionMetadata,
  documentosEvidencia = [],
}: BotonesNotificacionProps) {
  const [tipoNotificacion, setTipoNotificacion] = useState<"email" | "fisica">("email");
  const [state, formAction] = useActionState(
    (_prev: { error?: string } | null, formData: FormData) => enviarNotificacion(formData),
    null
  );

  if (yaNotificado) {
    const esFisica =
      notificacionMetadata &&
      (notificacionMetadata as { tipo?: string }).tipo === "fisica" &&
      Array.isArray((notificacionMetadata as { documentoIds?: number[] }).documentoIds) &&
      (notificacionMetadata as { documentoIds?: number[] }).documentoIds!.length > 0;
    const docs = documentosEvidencia ?? [];

    return (
      <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
        <p className="font-medium">
          {esFisica ? "Notificación física" : "Ya notificado"}
        </p>
        {fechaNotificacion && (
          <p className="text-muted-foreground text-xs mt-0.5">
            {formatFechaNotificacion(fechaNotificacion)}
          </p>
        )}
        {esFisica && docs.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs">
            {docs.map((doc) => (
              <li key={doc.id}>
                <a
                  href={`/api/procesos/${procesoId}/documentos/${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {doc.nombreOriginal}
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground text-xs mt-0.5">
          Solo se puede notificar una vez por proceso.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Tipo de notificación</p>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              name="tipoNotificacion"
              value="email"
              checked={tipoNotificacion === "email"}
              onChange={() => setTipoNotificacion("email")}
              className="rounded-full border-input"
            />
            Por email
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              name="tipoNotificacion"
              value="fisica"
              checked={tipoNotificacion === "fisica"}
              onChange={() => setTipoNotificacion("fisica")}
              className="rounded-full border-input"
            />
            Por vía física
          </label>
        </div>
      </div>

      {tipoNotificacion === "email" ? (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="procesoId" value={procesoId} />
          <input type="hidden" name="tipoNotificacion" value="email" />
          <Button type="submit" size="sm" variant="outline" aria-label="Enviar por email">
            Enviar por email
          </Button>
        </form>
      ) : (
        <form
          action={formAction}
          encType="multipart/form-data"
          className="space-y-2"
        >
          <input type="hidden" name="procesoId" value={procesoId} />
          <input type="hidden" name="tipoNotificacion" value="fisica" />
          <div className="grid gap-1.5">
            <Label htmlFor="archivo-notificacion" className="text-xs">
              Evidencia (adjunte al menos un archivo)
            </Label>
            <Input
              id="archivo-notificacion"
              name="archivo"
              type="file"
              multiple
              accept={ACCEPT_ARCHIVOS}
              aria-invalid={!!state?.error}
            />
            <p className="text-muted-foreground text-xs">
              PDF, imágenes, Word, Excel; máx. 10 MB por archivo.
            </p>
          </div>
          <Button type="submit" size="sm" variant="outline" aria-label="Registrar notificación física">
            Registrar notificación física
          </Button>
        </form>
      )}

      {state?.error && (
        <p className="text-destructive text-xs w-full" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}

// --- Cards de gestión por etapa (En contacto, Acuerdo de pago, Cobro coactivo) ---

type DocumentoItem = {
  id: number;
  nombreOriginal: string;
  mimeType: string;
  tamano: number;
  creadoEn: Date;
};

export type NotaItem = {
  id: number;
  comentario: string;
  fecha: Date;
};

export function ListaNotas({ notas }: { notas: NotaItem[] }): React.ReactNode {
  if (notas.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No hay notas en esta sección.
      </p>
    );
  }
  return (
    <ul className="space-y-2" role="list">
      {notas.map((n) => (
        <li
          key={n.id}
          className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
        >
          <p className="text-foreground">{n.comentario}</p>
          <span className="text-muted-foreground text-xs">
            {new Date(n.fecha).toLocaleString("es-CO", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}

type AccionEstadoFormProps = {
  procesoId: number;
  estadoDestino: string;
  label: string;
  variant?: "default" | "outline" | "secondary" | "destructive";
};

function AccionEstadoForm({
  procesoId,
  estadoDestino,
  label,
  variant = "outline",
}: AccionEstadoFormProps) {
  const [state, formAction] = useActionState(cambiarEstadoProceso, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="procesoId" value={procesoId} />
      <input type="hidden" name="estadoActual" value={estadoDestino} />
      <Input
        name="comentario"
        type="text"
        placeholder="Comentario (opcional)"
        className="h-9 w-48 text-sm"
        aria-label={`Comentario para ${label}`}
      />
      <Button type="submit" size="sm" variant={variant} aria-label={label}>
        {label}
      </Button>
      {state?.error && (
        <p className="text-destructive text-xs w-full" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

const CATEGORIA_EN_CONTACTO: CategoriaNota = "en_contacto";
const CATEGORIA_ACUERDO_PAGO: CategoriaNota = "acuerdo_pago";
const CATEGORIA_COBRO_COACTIVO: CategoriaNota = "cobro_coactivo";

type CardEtapaProps = {
  procesoId: number;
  estadoActual: string;
  documentos: DocumentoItem[];
  notas: NotaItem[];
};

export function CardEnContacto({
  procesoId,
  estadoActual,
  documentos,
  notas,
}: CardEtapaProps) {
  const activo = estadoActual === "notificado" || estadoActual === "en_contacto";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>En contacto</CardTitle>
        <CardDescription>
          El empleado gestiona el pago con el contribuyente. Agrega comentarios y documentos de esta etapa. Cuando haya resultado, usa una de las acciones.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {activo ? (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Acciones</h4>
              {estadoActual === "notificado" && (
                <AccionEstadoForm
                  procesoId={procesoId}
                  estadoDestino="en_contacto"
                  label="Pasar a En contacto"
                />
              )}
              {estadoActual === "en_contacto" && (
                <div className="space-y-3">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">El contribuyente realizó el pago</p>
                    <AccionEstadoForm
                      procesoId={procesoId}
                      estadoDestino="cobrado"
                      label="Registrar pago del contribuyente"
                      variant="default"
                    />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Se genera acuerdo de pago</p>
                    <AccionEstadoForm
                      procesoId={procesoId}
                      estadoDestino="en_negociacion"
                      label="Generar acuerdo de pago"
                    />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Se inicia cobro coactivo</p>
                    <AccionEstadoForm
                      procesoId={procesoId}
                      estadoDestino="en_cobro_coactivo"
                      label="Generar cobro coactivo"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Comentarios (En contacto)</h4>
              <AgregarNotaForm procesoId={procesoId} categoria={CATEGORIA_EN_CONTACTO} />
              <ListaNotas notas={notas} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Documentos (En contacto)</h4>
              <SubirDocumentoForm procesoId={procesoId} categoria={CATEGORIA_EN_CONTACTO} />
              <ListaDocumentos procesoId={procesoId} documentos={documentos} puedeEliminar />
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            El proceso no está en esta etapa (estado actual: {estadoActual.replace(/_/g, " ")}). Puedes agregar comentarios y documentos de esta sección igualmente.
          </p>
        )}
        {!activo && (
          <>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Comentarios (En contacto)</h4>
              <AgregarNotaForm procesoId={procesoId} categoria={CATEGORIA_EN_CONTACTO} />
              <ListaNotas notas={notas} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Documentos (En contacto)</h4>
              <ListaDocumentos procesoId={procesoId} documentos={documentos} puedeEliminar />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CardAcuerdoDePago({
  procesoId,
  estadoActual,
  documentos,
  notas,
}: CardEtapaProps) {
  const activo = estadoActual === "en_negociacion";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Acuerdo de pago</CardTitle>
        <CardDescription>
          Proceso con acuerdo de pago (En negociación). Si el contribuyente incumple, pasa a cobro coactivo. Documentos y notas asociados al acuerdo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {activo ? (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Acciones</h4>
              <AccionEstadoForm
                procesoId={procesoId}
                estadoDestino="en_cobro_coactivo"
                label="Incumplimiento del acuerdo → Pasar a cobro coactivo"
                variant="destructive"
              />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Comentarios (Acuerdo de pago)</h4>
              <AgregarNotaForm procesoId={procesoId} categoria={CATEGORIA_ACUERDO_PAGO} />
              <ListaNotas notas={notas} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Documentos (Acuerdo de pago)</h4>
              <SubirDocumentoForm procesoId={procesoId} categoria={CATEGORIA_ACUERDO_PAGO} />
              <ListaDocumentos procesoId={procesoId} documentos={documentos} puedeEliminar />
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            El proceso no está en acuerdo de pago (estado actual: {estadoActual.replace(/_/g, " ")}). Puedes agregar comentarios y documentos de esta sección.
          </p>
        )}
        {!activo && (
          <>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Comentarios (Acuerdo de pago)</h4>
              <AgregarNotaForm procesoId={procesoId} categoria={CATEGORIA_ACUERDO_PAGO} />
              <ListaNotas notas={notas} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Documentos (Acuerdo de pago)</h4>
              <ListaDocumentos procesoId={procesoId} documentos={documentos} puedeEliminar />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CardCobroCoactivo({
  procesoId,
  estadoActual,
  documentos,
  notas,
}: CardEtapaProps) {
  const activo = estadoActual === "en_cobro_coactivo";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Cobro coactivo</CardTitle>
        <CardDescription>
          Proceso en cobro coactivo. Documentos y notas de esta etapa. Si se determina que es incobrable, se puede marcar como tal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {activo ? (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Acciones</h4>
              <AccionEstadoForm
                procesoId={procesoId}
                estadoDestino="incobrable"
                label="Marcar como incobrable"
                variant="secondary"
              />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Comentarios (Cobro coactivo)</h4>
              <AgregarNotaForm procesoId={procesoId} categoria={CATEGORIA_COBRO_COACTIVO} />
              <ListaNotas notas={notas} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Documentos (Cobro coactivo)</h4>
              <SubirDocumentoForm procesoId={procesoId} categoria={CATEGORIA_COBRO_COACTIVO} />
              <ListaDocumentos procesoId={procesoId} documentos={documentos} puedeEliminar />
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            El proceso no está en cobro coactivo (estado actual: {estadoActual.replace(/_/g, " ")}). Puedes agregar comentarios y documentos de esta sección.
          </p>
        )}
        {!activo && (
          <>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Comentarios (Cobro coactivo)</h4>
              <AgregarNotaForm procesoId={procesoId} categoria={CATEGORIA_COBRO_COACTIVO} />
              <ListaNotas notas={notas} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Documentos (Cobro coactivo)</h4>
              <ListaDocumentos procesoId={procesoId} documentos={documentos} puedeEliminar />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
