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
import { CardSectionAccordion } from "@/components/ui/card-accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  cambiarEstadoProceso,
  asignarProceso,
  agregarNotaProceso,
  enviarNotificacion,
} from "@/lib/actions/procesos";
import { actualizarDatosCobroCoactivoForm } from "@/lib/actions/cobros-coactivos";
import type { EvidenciaEnvioEmail } from "@/lib/notificaciones/resend";
import { cn } from "@/lib/utils";
import {
  ListaDocumentos,
  SubirDocumentoForm,
} from "@/components/procesos/documentos-proceso";
import { labelEstado } from "@/lib/estados-proceso";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "asignado", label: "Asignado" },
  { value: "notificado", label: "Notificado" },
  { value: "en_contacto", label: "Cobro persuasivo" },
  { value: "en_cobro_coactivo", label: "En cobro coactivo" },
  { value: "cobrado", label: "Cobrado" },
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

export type CategoriaNota = "general" | "en_contacto" | "acuerdo_pago" | "cobro_coactivo";

type AgregarNotaFormProps = {
  procesoId: number;
  /** Categoría de la nota: general, en_contacto, acuerdo_pago, cobro_coactivo */
  categoria: CategoriaNota;
};

export function AgregarNotaForm({ procesoId, categoria }: AgregarNotaFormProps) {
  const [state, formAction] = useActionState(agregarNotaProceso, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="procesoId" value={procesoId} />
      <input type="hidden" name="categoria" value={categoria} />
      <div className="grid gap-1.5">
        <Label htmlFor="comentario-nota" className="text-xs font-medium">
          Nueva nota
        </Label>
        <Textarea
          id="comentario-nota"
          name="comentario"
          placeholder="Ej. Llamada al contribuyente: solicita plan de pagos en 3 cuotas. Quedó en enviar documentación por correo."
          className="min-h-[88px] w-full"
          required
          aria-invalid={!!state?.error}
          rows={3}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
  /** Metadata del evento de notificación (tipo "fisica" | email), documentoIds si es física, envios si es email */
  notificacionMetadata?: {
    tipo?: string;
    documentoIds?: number[];
    envios?: EvidenciaEnvioEmail[];
  } | null;
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
      notificacionMetadata.tipo === "fisica" &&
      Array.isArray(notificacionMetadata.documentoIds) &&
      notificacionMetadata.documentoIds.length > 0;
    const docs = documentosEvidencia ?? [];
    const enviosEmail = notificacionMetadata?.envios ?? [];

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
        {!esFisica && enviosEmail.length > 0 && (
          <div className="mt-2 text-xs">
            <p className="font-medium text-foreground">Evidencia de envío</p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {enviosEmail.map((envio, i) => (
                <li key={i}>
                  {envio.to}
                  {" · "}
                  {new Date(envio.sentAt).toLocaleString("es-CO", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                  {envio.resendId && ` · ID: ${envio.resendId}`}
                </li>
              ))}
            </ul>
          </div>
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
  autorNombre?: string | null;
};

function formatTiempoRelativo(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return d.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

export function ListaNotas({ notas }: { notas: NotaItem[] }): React.ReactNode {
  if (notas.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-border/80 bg-muted/20 py-8 px-4 text-center"
        role="status"
        aria-label="No hay notas"
      >
        <p className="text-muted-foreground text-sm font-medium">
          Aún no hay notas
        </p>
        <p className="text-muted-foreground/80 text-xs mt-1 max-w-[280px] mx-auto">
          Añade la primera nota para dejar registro de llamadas, acuerdos o seguimiento de este proceso.
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-3" role="list">
      {notas.map((n) => (
        <li
          key={n.id}
          className="group rounded-xl border border-border/80 bg-card px-4 py-3 text-sm shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-foreground whitespace-pre-wrap">{n.comentario}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 text-xs text-muted-foreground">
            {n.autorNombre && (
              <span className="font-medium text-muted-foreground">
                {n.autorNombre}
              </span>
            )}
            <span title={new Date(n.fecha).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}>
              {formatTiempoRelativo(n.fecha)}
            </span>
          </div>
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

export function AccionEstadoForm({
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
const CATEGORIA_COBRO_COACTIVO: CategoriaNota = "cobro_coactivo";

type DatosCobroCoactivoFormProps = {
  procesoId: number;
  noCoactivo: string;
  fechaInicio: Date | string;
};

function DatosCobroCoactivoForm({
  procesoId,
  noCoactivo,
  fechaInicio,
}: DatosCobroCoactivoFormProps) {
  const [state, formAction] = useActionState(actualizarDatosCobroCoactivoForm, null);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
      <h4 className="text-sm font-medium">Datos del sistema externo</h4>
      <input type="hidden" name="procesoId" value={procesoId} />
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="noCoactivo-cc" className="text-xs">
            No. Coactivo
          </Label>
          <Input
            id="noCoactivo-cc"
            name="noCoactivo"
            type="text"
            placeholder="Ej. 12345"
            defaultValue={noCoactivo}
            className="w-40"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="fechaInicio-cc" className="text-xs">
            Fecha
          </Label>
          <Input
            id="fechaInicio-cc"
            name="fechaInicio"
            type="date"
            required
            defaultValue={fechaToInputValue(fechaInicio)}
            className="w-40"
          />
        </div>
        <Button type="submit" size="sm">
          Guardar
        </Button>
      </div>
      {state?.error && (
        <p className="text-destructive text-xs" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

type CardEtapaProps = {
  procesoId: number;
  estadoActual: string;
  documentos: DocumentoItem[];
  notas: NotaItem[];
};

type CobroCoactivoEntity = {
  fechaInicio: Date | string;
  noCoactivo?: string | null;
} | null;

function fechaToInputValue(fecha: Date | string | null | undefined): string {
  if (fecha == null) return "";
  const d = typeof fecha === "string" ? new Date(fecha + "T12:00:00") : fecha;
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

const DESCRIPCION_EN_CONTACTO =
  "Gestión del pago con el contribuyente tras la notificación. Agrega comentarios y documentos de esta etapa. Puedes pasar a acuerdo de pago, a cobro coactivo (sin necesidad de acuerdo previo) o registrar pago. Cuando haya resultado, usa una de las acciones.";

export function CardEnContacto({
  procesoId,
  estadoActual,
  documentos,
  notas,
}: CardEtapaProps) {
  const activo = estadoActual === "notificado" || estadoActual === "en_contacto";

  return (
    <CardSectionAccordion
      title="Cobro persuasivo"
      description={DESCRIPCION_EN_CONTACTO}
    >
        {activo ? (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Acciones</h4>
              {estadoActual === "notificado" && (
                <AccionEstadoForm
                  procesoId={procesoId}
                  estadoDestino="en_contacto"
                  label="Pasar a Cobro persuasivo"
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
                    <p className="text-muted-foreground text-xs mb-1">Se inicia cobro coactivo (sin acuerdo de pago)</p>
                    <AccionEstadoForm
                      procesoId={procesoId}
                      estadoDestino="en_cobro_coactivo"
                      label="Pasar a cobro coactivo"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Comentarios (Cobro persuasivo)</h4>
              <AgregarNotaForm procesoId={procesoId} categoria={CATEGORIA_EN_CONTACTO} />
              <ListaNotas notas={notas} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Documentos (Cobro persuasivo)</h4>
              <SubirDocumentoForm procesoId={procesoId} categoria={CATEGORIA_EN_CONTACTO} />
              <ListaDocumentos procesoId={procesoId} documentos={documentos} puedeEliminar />
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            El proceso no está en esta etapa (estado actual: {labelEstado(estadoActual)}). Puedes agregar comentarios y documentos de esta sección igualmente.
          </p>
        )}
        {!activo && (
          <>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Comentarios (Cobro persuasivo)</h4>
              <AgregarNotaForm procesoId={procesoId} categoria={CATEGORIA_EN_CONTACTO} />
              <ListaNotas notas={notas} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Documentos (Cobro persuasivo)</h4>
              <ListaDocumentos procesoId={procesoId} documentos={documentos} puedeEliminar />
            </div>
          </>
        )}
    </CardSectionAccordion>
  );
}

/** Estados desde los que se puede pasar a cobro coactivo desde esta card */
const ESTADOS_PUEDEN_INICIAR_COBRO_COACTIVO = ["notificado", "en_contacto"] as const;

const DESCRIPCION_COBRO_COACTIVO_INACTIVO =
  "Etapa independiente del acuerdo de pago. Puede iniciarse desde Cobro persuasivo (sin acuerdo) o desde Acuerdos de pago (por incumplimiento). Inicia el cobro coactivo cuando corresponda.";

export function CardCobroCoactivo({
  procesoId,
  estadoActual,
  documentos,
  notas,
  cobroCoactivo = null,
}: CardEtapaProps & { cobroCoactivo?: CobroCoactivoEntity }) {
  const activo = estadoActual === "en_cobro_coactivo";
  const puedeIniciar =
    !activo && ESTADOS_PUEDEN_INICIAR_COBRO_COACTIVO.includes(estadoActual as (typeof ESTADOS_PUEDEN_INICIAR_COBRO_COACTIVO)[number]);
  const fechaInicio = cobroCoactivo?.fechaInicio
    ? new Date(cobroCoactivo.fechaInicio).toLocaleDateString("es-CO")
    : null;
  const descripcion = fechaInicio
    ? `Cobro activo desde ${fechaInicio}. Documentos y notas de esta etapa. Cuando se efectúe el cobro, regístralo con la acción correspondiente.`
    : DESCRIPCION_COBRO_COACTIVO_INACTIVO;

  return (
    <CardSectionAccordion title="Cobro coactivo" description={descripcion}>
        {activo ? (
          <>
            {cobroCoactivo && (
              <DatosCobroCoactivoForm
                procesoId={procesoId}
                noCoactivo={cobroCoactivo.noCoactivo ?? ""}
                fechaInicio={cobroCoactivo.fechaInicio}
              />
            )}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Acciones</h4>
              <AccionEstadoForm
                procesoId={procesoId}
                estadoDestino="cobrado"
                label="Registrar cobro"
                variant="default"
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
          <>
            {puedeIniciar && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Acciones</h4>
                <AccionEstadoForm
                  procesoId={procesoId}
                  estadoDestino="en_cobro_coactivo"
                  label="Iniciar cobro coactivo"
                  variant="default"
                />
              </div>
            )}
            {!puedeIniciar && (
              <p className="text-muted-foreground text-sm">
                El proceso no está en cobro coactivo (estado actual: {labelEstado(estadoActual)}). Para iniciar cobro coactivo, el proceso debe estar en Cobro persuasivo o Notificado.
              </p>
            )}
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
    </CardSectionAccordion>
  );
}
