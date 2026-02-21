import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  estadoActaEnum,
  tipoIntegranteActaEnum,
  estadoCompromisoActaEnum,
  tipoEventoActaEnum,
} from "./enums";
import { usuarios } from "./usuarios";
import { clientes, clientesMiembros } from "./clientes";
import { actividades } from "./obligaciones";

// Tabla: actas_reunion
export const actasReunion = pgTable("actas_reunion", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Número secuencial de acta para referencia humana (Acta #1, #2, ...). */
  serial: integer("serial")
    .notNull()
    .unique()
    .default(sql`nextval('actas_reunion_serial_seq'::regclass)`),
  fecha: date("fecha").notNull(),
  objetivo: text("objetivo").notNull(),
  contenido: text("contenido"),
  /** Compromisos acordados en la reunión (contenido enriquecido, igual que contenido). */
  compromisos: text("compromisos"),
  estado: estadoActaEnum("estado").notNull().default("borrador"),
  creadoPorId: integer("creado_por_id")
    .notNull()
    .references(() => usuarios.id, { onDelete: "restrict", onUpdate: "cascade" }),
  aprobadoPorId: integer("aprobado_por_id").references(() => usuarios.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: actas_integrantes (N:M acta – integrantes; interno = empleado propio, externo = miembro externo)
export const actasIntegrantes = pgTable("actas_integrantes", {
  id: serial("id").primaryKey(),
  actaId: uuid("acta_id")
    .notNull()
    .references(() => actasReunion.id, { onDelete: "cascade", onUpdate: "cascade" }),
  tipo: tipoIntegranteActaEnum("tipo").notNull().default("externo"),
  nombre: text("nombre").notNull(),
  email: text("email").notNull(),
  /** Cargo del asistente; se usa sobre todo para integrantes externos. */
  cargo: text("cargo"),
  usuarioId: integer("usuario_id").references(() => usuarios.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  /** Si true, al enviar el acta por correo se le solicita aprobación a este asistente. */
  solicitarAprobacionCorreo: boolean("solicitar_aprobacion_correo").notNull().default(true),
});

// Tabla: compromisos_acta (compromisos individuales por acta: descripción, fecha límite, persona asignada, seguimiento)
export const compromisosActa = pgTable("compromisos_acta", {
  id: serial("id").primaryKey(),
  actaId: uuid("acta_id")
    .notNull()
    .references(() => actasReunion.id, { onDelete: "cascade", onUpdate: "cascade" }),
  /** Descripción del compromiso. */
  descripcion: text("descripcion").notNull(),
  /** Fecha límite para cumplir el compromiso. */
  fechaLimite: date("fecha_limite"),
  /** Integrante del acta (nuestra empresa o asistente) asignado como responsable. */
  actaIntegranteId: integer("acta_integrante_id").references(() => actasIntegrantes.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  /** Miembro del cliente asignado como responsable (alternativa a acta_integrante_id). */
  clienteMiembroId: integer("cliente_miembro_id").references(() => clientesMiembros.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  /** Estado de seguimiento del compromiso. */
  estado: estadoCompromisoActaEnum("estado").notNull().default("pendiente"),
  /** Detalle u observación al actualizar el estado (motivo, comentario). */
  detalleActualizacion: text("detalle_actualizacion"),
  /** Fecha de la última actualización de estado. */
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }),
  /** Usuario que actualizó el estado por última vez. */
  actualizadoPorId: integer("actualizado_por_id").references(() => usuarios.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
});

/** Historial de actualizaciones de estado de un compromiso de acta (hoja de vida) */
export const compromisosActaHistorial = pgTable("compromisos_acta_historial", {
  id: serial("id").primaryKey(),
  compromisoActaId: integer("compromiso_acta_id")
    .notNull()
    .references(() => compromisosActa.id, { onDelete: "cascade", onUpdate: "cascade" }),
  /** Estado anterior (null en la primera actualización o creación). */
  estadoAnterior: estadoCompromisoActaEnum("estado_anterior"),
  /** Estado después de esta actualización. */
  estadoNuevo: estadoCompromisoActaEnum("estado_nuevo").notNull(),
  /** Observación o detalle de esta actualización. */
  detalle: text("detalle"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  creadoPorId: integer("creado_por_id").references(() => usuarios.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
});

/** Documentos adjuntos a una actualización de compromiso (historial). */
export const documentosCompromisoActa = pgTable("documentos_compromiso_acta", {
  id: serial("id").primaryKey(),
  compromisoActaHistorialId: integer("compromiso_acta_historial_id")
    .notNull()
    .references(() => compromisosActaHistorial.id, { onDelete: "cascade", onUpdate: "cascade" }),
  nombreOriginal: text("nombre_original").notNull(),
  rutaArchivo: text("ruta_archivo").notNull(),
  mimeType: text("mime_type").notNull(),
  tamano: integer("tamano").notNull(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: aprobaciones_acta_participante (respuesta del participante tras envío: aprobación o rechazo)
export const aprobacionesActaParticipante = pgTable(
  "aprobaciones_acta_participante",
  {
    id: serial("id").primaryKey(),
    actaId: uuid("acta_id")
      .notNull()
      .references(() => actasReunion.id, { onDelete: "cascade", onUpdate: "cascade" }),
    actaIntegranteId: integer("acta_integrante_id")
      .notNull()
      .references(() => actasIntegrantes.id, { onDelete: "cascade", onUpdate: "cascade" }),
    aprobadoEn: timestamp("aprobado_en", { withTimezone: true }).defaultNow().notNull(),
    /** Ruta relativa de la foto enviada al aprobar (ej. actas/1/aprobaciones/uuid.jpg). */
    rutaFoto: text("ruta_foto"),
    /** Si true, el participante rechazó el acta (en lugar de aprobarla). */
    rechazado: boolean("rechazado").notNull().default(false),
    /** Motivo del rechazo, cuando rechazado = true. */
    motivoRechazo: text("motivo_rechazo"),
  },
  (t) => [unique("aprobaciones_acta_integrante_uniq").on(t.actaId, t.actaIntegranteId)]
);

// Tabla: documentos_acta (adjuntos por acta)
export const documentosActa = pgTable("documentos_acta", {
  id: serial("id").primaryKey(),
  actaId: uuid("acta_id")
    .notNull()
    .references(() => actasReunion.id, { onDelete: "cascade", onUpdate: "cascade" }),
  nombreOriginal: text("nombre_original").notNull(),
  rutaArchivo: text("ruta_archivo").notNull(),
  mimeType: text("mime_type").notNull(),
  tamano: integer("tamano").notNull(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: historial_acta (registro de modificaciones)
export const historialActa = pgTable("historial_acta", {
  id: serial("id").primaryKey(),
  actaId: uuid("acta_id")
    .notNull()
    .references(() => actasReunion.id, { onDelete: "cascade", onUpdate: "cascade" }),
  usuarioId: integer("usuario_id").references(() => usuarios.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  tipoEvento: tipoEventoActaEnum("tipo_evento").notNull(),
  fecha: timestamp("fecha", { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb("metadata"),
});

// Tabla: actas_reunion_actividades (N:M acta – actividades desarrolladas en el acta)
export const actasReunionActividades = pgTable(
  "actas_reunion_actividades",
  {
    actaId: uuid("acta_id")
      .notNull()
      .references(() => actasReunion.id, { onDelete: "cascade", onUpdate: "cascade" }),
    actividadId: integer("actividad_id")
      .notNull()
      .references(() => actividades.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (t) => [{ primaryKey: { columns: [t.actaId, t.actividadId] } }]
);

// Tabla: actas_reunion_clientes (N:M acta – clientes)
export const actasReunionClientes = pgTable(
  "actas_reunion_clientes",
  {
    actaId: uuid("acta_id")
      .notNull()
      .references(() => actasReunion.id, { onDelete: "cascade", onUpdate: "cascade" }),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (t) => [{ primaryKey: { columns: [t.actaId, t.clienteId] } }]
);

export type ActaReunion = typeof actasReunion.$inferSelect;
export type NewActaReunion = typeof actasReunion.$inferInsert;
export type ActaIntegrante = typeof actasIntegrantes.$inferSelect;
export type NewActaIntegrante = typeof actasIntegrantes.$inferInsert;
export type CompromisoActa = typeof compromisosActa.$inferSelect;
export type NewCompromisoActa = typeof compromisosActa.$inferInsert;
export type CompromisoActaHistorial = typeof compromisosActaHistorial.$inferSelect;
export type NewCompromisoActaHistorial = typeof compromisosActaHistorial.$inferInsert;
export type DocumentoCompromisoActa = typeof documentosCompromisoActa.$inferSelect;
export type NewDocumentoCompromisoActa = typeof documentosCompromisoActa.$inferInsert;
export type AprobacionActaParticipante = typeof aprobacionesActaParticipante.$inferSelect;
export type NewAprobacionActaParticipante = typeof aprobacionesActaParticipante.$inferInsert;
export type DocumentoActa = typeof documentosActa.$inferSelect;
export type NewDocumentoActa = typeof documentosActa.$inferInsert;
export type HistorialActa = typeof historialActa.$inferSelect;
export type NewHistorialActa = typeof historialActa.$inferInsert;
export type ActaReunionCliente = typeof actasReunionClientes.$inferSelect;
export type NewActaReunionCliente = typeof actasReunionClientes.$inferInsert;
export type ActaReunionActividad = typeof actasReunionActividades.$inferSelect;
export type NewActaReunionActividad = typeof actasReunionActividades.$inferInsert;
