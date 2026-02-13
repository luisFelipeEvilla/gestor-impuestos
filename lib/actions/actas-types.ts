import { z } from "zod";

/** Valores de estado del acta. */
export const estadoActaValues = [
  "borrador",
  "pendiente_aprobacion",
  "aprobada",
  "enviada",
] as const;

/** Item de compromiso enviado desde el formulario. Asignado: integrante (índice) o miembro del cliente (id). */
export const compromisoFormSchema = z.object({
  descripcion: z.string().min(1, "La descripción es obligatoria").max(5000),
  fechaLimite: z.string().optional().or(z.literal("")),
  /** Índice en la lista de integrantes del acta (nuestra empresa o asistente). */
  asignadoIndex: z.number().int().min(-1).nullable(),
  /** ID de miembro del cliente (alternativa a asignadoIndex). */
  asignadoClienteMiembroId: z.number().int().positive().nullable(),
});
export type CompromisoFormItem = z.infer<typeof compromisoFormSchema>;

export type EstadoFormActa = {
  error?: string;
  errores?: Record<string, string[]>;
};

export type EstadoGestionActa = { error?: string };

export type ActaListItem = {
  id: number;
  fecha: Date;
  objetivo: string;
  estado: (typeof estadoActaValues)[number];
  creadorNombre: string | null;
  numIntegrantes: number;
};

export type CompromisoDetalle = {
  id: number;
  descripcion: string;
  fechaLimite: Date | null;
  asignadoNombre: string | null;
  /** Cargo de la persona asignada (integrante o miembro del cliente). */
  asignadoCargo: string | null;
  estado?: "pendiente" | "cumplido" | "no_cumplido";
  detalleActualizacion?: string | null;
  actualizadoEn?: Date | null;
};

export type ActaDetalle = {
  id: number;
  fecha: Date;
  objetivo: string;
  contenido: string | null;
  compromisos: string | null;
  compromisosLista: CompromisoDetalle[];
  estado: (typeof estadoActaValues)[number];
  creadoPorId: number;
  creadorNombre: string | null;
  aprobadoPorId: number | null;
  aprobadoPorNombre: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
  clientes: { id: number; nombre: string; codigo: string | null }[];
  integrantes: {
    id: number;
    nombre: string;
    email: string;
    usuarioId: number | null;
    tipo: "interno" | "externo";
    cargo: string | null;
    solicitarAprobacionCorreo: boolean;
  }[];
  documentos: {
    id: number;
    nombreOriginal: string;
    mimeType: string;
    tamano: number;
    creadoEn: Date;
  }[];
};

export type HistorialActaItem = {
  id: number;
  fecha: Date;
  tipoEvento: string;
  usuarioNombre: string | null;
  metadata: unknown;
};

export type AprobacionParticipanteItem = {
  actaIntegranteId: number;
  nombre: string;
  email: string;
  cargo: string | null;
  aprobadoEn: Date | null;
  rutaFoto: string | null;
  /** Si el participante rechazó el acta. */
  rechazado: boolean;
  /** Motivo del rechazo, cuando rechazado = true. */
  motivoRechazo: string | null;
};
