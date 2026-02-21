"use client";

import { useActionState, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
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
  eliminarNotaProceso,
  actualizarNotaProceso,
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
import { ConfirmarEliminacionModal } from "@/components/confirmar-eliminacion-modal";
import { FileInputDropzone } from "@/components/ui/file-input-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Mail } from "lucide-react";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "asignado", label: "Asignado" },
  { value: "facturacion", label: "Facturación" },
  { value: "acuerdo_pago", label: "Acuerdo de pago" },
  { value: "en_cobro_coactivo", label: "Cobro coactivo" },
  { value: "finalizado", label: "Finalizado" },
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

function EvidenciaEnvioEmailBlock({ envios }: { envios: EvidenciaEnvioEmail[] }) {
  const [verContenidoEnvio, setVerContenidoEnvio] = useState<EvidenciaEnvioEmail | null>(null);

  return (
    <div className="mt-2 text-xs">
      <p className="font-medium text-foreground">Evidencia de envío</p>
      <ul className="mt-1 space-y-1.5 text-muted-foreground">
        {envios.map((envio, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {envio.to}
              {" · "}
              {new Date(envio.sentAt).toLocaleString("es-CO", {
                dateStyle: "short",
                timeStyle: "short",
              })}
              {envio.resendId && ` · ID: ${envio.resendId}`}
            </span>
            {envio.bodyHtml && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-1.5 text-xs"
                onClick={() => setVerContenidoEnvio(envio)}
                aria-label="Ver contenido del correo enviado"
              >
                <Mail className="size-3" aria-hidden />
                Ver contenido del correo
              </Button>
            )}
          </li>
        ))}
      </ul>
      <Dialog open={verContenidoEnvio != null} onOpenChange={(open) => !open && setVerContenidoEnvio(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">
              {verContenidoEnvio?.subject ?? "Contenido del correo"}
            </DialogTitle>
          </DialogHeader>
          {verContenidoEnvio?.bodyHtml && (
            <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border/80 bg-white dark:bg-muted/20 p-4">
              <div
                className="max-w-full [&_table]:max-w-full"
                dangerouslySetInnerHTML={{ __html: verContenidoEnvio.bodyHtml }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function BotonesNotificacion({
  procesoId,
  yaNotificado,
  fechaNotificacion,
  notificacionMetadata,
  documentosEvidencia = [],
}: BotonesNotificacionProps) {
  const [tipoNotificacion, setTipoNotificacion] = useState<"email" | "fisica">("email");
  const [confirmarEmailOpen, setConfirmarEmailOpen] = useState(false);
  const formEmailRef = useRef<HTMLFormElement>(null);
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
          <EvidenciaEnvioEmailBlock envios={enviosEmail} />
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
        <>
          <form ref={formEmailRef} action={formAction} className="space-y-2">
            <input type="hidden" name="procesoId" value={procesoId} />
            <input type="hidden" name="tipoNotificacion" value="email" />
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Enviar por email"
              onClick={() => setConfirmarEmailOpen(true)}
            >
              Enviar por email
            </Button>
          </form>
          <ConfirmarEliminacionModal
            open={confirmarEmailOpen}
            onOpenChange={setConfirmarEmailOpen}
            title="¿Enviar notificación por email?"
            description="Se enviará el correo al contribuyente. ¿Desea continuar?"
            confirmLabel="Enviar por email"
            cancelLabel="Cancelar"
            onConfirm={() => formEmailRef.current?.requestSubmit()}
          />
        </>
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
            <FileInputDropzone
              id="archivo-notificacion"
              name="archivo"
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
  /** Id del usuario autor; si no se pasa, la UI no puede decidir si mostrar editar/eliminar. */
  autorId?: number | null;
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

type SessionUser = { id: number; rol: string };

type NotaRowProps = {
  nota: NotaItem;
  procesoId?: number;
  sessionUser?: SessionUser | null;
};

function NotaRow({ nota, procesoId, sessionUser }: NotaRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(nota.comentario);
  const [error, setError] = useState<string | null>(null);
  const [openEliminar, setOpenEliminar] = useState(false);

  const esAdmin = sessionUser?.rol === "admin";
  const esAutor = nota.autorId != null && sessionUser?.id === nota.autorId;
  const puedeGestionar = procesoId != null && sessionUser != null && (esAdmin || esAutor);

  const handleGuardar = () => {
    if (!procesoId || editText.trim() === nota.comentario) {
      setEditing(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await actualizarNotaProceso(procesoId, nota.id, editText.trim());
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  const handleEliminar = () => {
    if (!procesoId) return;
    startTransition(async () => {
      const result = await eliminarNotaProceso(procesoId, nota.id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <li
      className="group rounded-xl border border-border/80 bg-card px-4 py-3 text-sm shadow-sm transition-shadow hover:shadow-md"
      data-cursor-element-id={`nota-${nota.id}`}
    >
      {editing ? (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[88px] w-full text-sm"
              rows={3}
              disabled={isPending}
              aria-label="Editar nota"
            />
            {error && (
              <p className="text-destructive text-xs" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleGuardar}
                disabled={isPending || !editText.trim()}
              >
                {isPending ? "Guardando…" : "Guardar"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setEditText(nota.comentario);
                  setError(null);
                }}
                disabled={isPending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-foreground whitespace-pre-wrap">{nota.comentario}</p>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 mt-2 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {nota.autorNombre && (
                  <span className="font-medium text-muted-foreground">
                    {nota.autorNombre}
                  </span>
                )}
                <span
                  title={new Date(nota.fecha).toLocaleString("es-CO", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                >
                  {formatTiempoRelativo(nota.fecha)}
                </span>
              </div>
              {puedeGestionar && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditing(true)}
                    disabled={isPending}
                    aria-label="Editar nota"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setOpenEliminar(true)}
                    disabled={isPending}
                    aria-label="Eliminar nota"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      {puedeGestionar && (
        <ConfirmarEliminacionModal
          open={openEliminar}
          onOpenChange={setOpenEliminar}
          title="Eliminar nota"
          description="¿Estás seguro de que quieres eliminar esta nota? Esta acción no se puede deshacer."
          onConfirm={handleEliminar}
          isPending={isPending}
        />
      )}
    </li>
  );
}

export type ListaNotasProps = {
  notas: NotaItem[];
  /** Si se pasan procesoId y sessionUser, cada nota muestra editar/eliminar solo al autor o admin. */
  procesoId?: number;
  /** Usuario actual (id + rol). Si no se pasa, no se muestran botones de editar/eliminar. */
  sessionUser?: { id: number; rol: string } | null;
  categoria?: CategoriaNota;
};

export function ListaNotas({ notas, procesoId, sessionUser }: ListaNotasProps): React.ReactNode {
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
        <NotaRow key={n.id} nota={n} procesoId={procesoId} sessionUser={sessionUser} />
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
  sessionUser?: { id: number; rol: string } | null;
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

const DESCRIPCION_FACTURACION =
  "Etapa de facturación y gestión inicial. Agrega comentarios y documentos. Puedes pasar a Acuerdo de pago, a Cobro coactivo (sin acuerdo previo) o finalizar si se registra el pago.";

export function CardEnContacto({
  procesoId,
  estadoActual,
  documentos,
  notas,
  sessionUser,
}: CardEtapaProps) {
  const activo = estadoActual === "asignado" || estadoActual === "facturacion";

  return (
    <CardSectionAccordion
      title="Facturación"
      description={DESCRIPCION_FACTURACION}
    >
        {activo ? (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Acciones</h4>
              {estadoActual === "asignado" && (
                <AccionEstadoForm
                  procesoId={procesoId}
                  estadoDestino="facturacion"
                  label="Pasar a Facturación"
                />
              )}
              {estadoActual === "facturacion" && (
                <div className="space-y-3">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">El contribuyente realizó el pago</p>
                    <AccionEstadoForm
                      procesoId={procesoId}
                      estadoDestino="finalizado"
                      label="Finalizar (registrar pago)"
                      variant="default"
                    />
                  </div>
                  <AccionEstadoForm
                    procesoId={procesoId}
                    estadoDestino="acuerdo_pago"
                    label="Pasar a Acuerdo de pago"
                  />
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
              <h4 className="text-sm font-medium">Comentarios (Facturación)</h4>
              <AgregarNotaForm procesoId={procesoId} categoria={CATEGORIA_EN_CONTACTO} />
              <ListaNotas notas={notas} procesoId={procesoId} sessionUser={sessionUser} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Documentos (Facturación)</h4>
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
              <h4 className="text-sm font-medium">Comentarios (Facturación)</h4>
              <AgregarNotaForm procesoId={procesoId} categoria={CATEGORIA_EN_CONTACTO} />
              <ListaNotas notas={notas} procesoId={procesoId} sessionUser={sessionUser} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Documentos (Facturación)</h4>
              <ListaDocumentos procesoId={procesoId} documentos={documentos} puedeEliminar />
            </div>
          </>
        )}
    </CardSectionAccordion>
  );
}

/** Contexto normativo: cobro coactivo como ejecución ante la autoridad competente. */
const CONTEXTO_COBRO_COACTIVO =
  "El cobro coactivo es la etapa de ejecución ante la autoridad competente (Estatuto Tributario / Ley 1437), con títulos ejecutivos y medidas de ley. El número de expediente y la fecha deben coincidir con el sistema donde se tramita el cobro. El plazo de prescripción se calcula desde la fecha de inicio del cobro coactivo.";

const DESCRIPCION_COBRO_COACTIVO_INACTIVO =
  "Etapa independiente del acuerdo de pago. Puede iniciarse en cualquier momento (sin necesidad de pasar por Acuerdos de pago). Inicia el cobro coactivo cuando corresponda.";

export function CardCobroCoactivo({
  procesoId,
  estadoActual,
  documentos,
  notas,
  sessionUser,
  cobroCoactivo = null,
}: CardEtapaProps & { cobroCoactivo?: CobroCoactivoEntity }) {
  const activo = estadoActual === "en_cobro_coactivo";
  const puedeIniciar = !activo && estadoActual !== "finalizado";
  const fechaInicio = cobroCoactivo?.fechaInicio
    ? new Date(cobroCoactivo.fechaInicio).toLocaleDateString("es-CO")
    : null;

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cobro coactivo</CardTitle>
          <CardDescription className="space-y-1.5">
            {CONTEXTO_COBRO_COACTIVO}
            {fechaInicio && (
              <span className="block font-medium text-foreground/90">Cobro activo desde {fechaInicio}.</span>
            )}
            {!activo && puedeIniciar && (
              <span className="block">{DESCRIPCION_COBRO_COACTIVO_INACTIVO}</span>
            )}
            {!puedeIniciar && estadoActual === "finalizado" && (
              <span className="block text-muted-foreground">El proceso ya está finalizado. No es posible iniciar cobro coactivo.</span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {activo && cobroCoactivo && (
        <Card>
          <CardHeader>
            <CardTitle>Datos del expediente</CardTitle>
            <CardDescription>
              Número de coactivo y fecha alineados al sistema donde se tramita el cobro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DatosCobroCoactivoForm
              procesoId={procesoId}
              noCoactivo={cobroCoactivo.noCoactivo ?? ""}
              fechaInicio={cobroCoactivo.fechaInicio}
            />
          </CardContent>
        </Card>
      )}

      {activo && (
        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
            <CardDescription>
              Cuando se efectúe el cobro, regístralo para finalizar el proceso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccionEstadoForm
              procesoId={procesoId}
              estadoDestino="finalizado"
              label="Registrar cobro"
              variant="default"
            />
          </CardContent>
        </Card>
      )}

      {puedeIniciar && !activo && (
        <Card>
          <CardHeader>
            <CardTitle>Iniciar cobro coactivo</CardTitle>
            <CardDescription>
              Crea el registro de cobro coactivo y pasa el proceso a esta etapa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccionEstadoForm
              procesoId={procesoId}
              estadoDestino="en_cobro_coactivo"
              label="Iniciar cobro coactivo"
              variant="default"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
          <CardDescription>
            Mandamiento de pago, medidas cautelares, resoluciones y constancias de esta etapa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activo ? (
            <>
              <SubirDocumentoForm procesoId={procesoId} categoria={CATEGORIA_COBRO_COACTIVO} />
              <ListaDocumentos procesoId={procesoId} documentos={documentos} puedeEliminar />
            </>
          ) : (
            <ListaDocumentos procesoId={procesoId} documentos={documentos} puedeEliminar />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comentarios</CardTitle>
          <CardDescription>
            Notas y seguimiento del cobro coactivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AgregarNotaForm procesoId={procesoId} categoria={CATEGORIA_COBRO_COACTIVO} />
          <ListaNotas notas={notas} procesoId={procesoId} sessionUser={sessionUser} />
        </CardContent>
      </Card>
    </div>
  );
}
