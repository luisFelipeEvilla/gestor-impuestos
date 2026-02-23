import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import {
  estadoProcesoEnum,
  tipoEventoHistorialEnum,
  categoriaDocumentoNotaEnum,
  tipoResolucionEnum,
  tipoDocumentoProcesoEnum,
} from "./enums";
import { contribuyentes } from "./contribuyentes";
import { usuarios } from "./usuarios";
import { impuestos } from "./impuestos";

// Tabla: procesos (trabajo de cobro)
export const procesos = pgTable("procesos", {
  id: serial("id").primaryKey(),
  contribuyenteId: integer("contribuyente_id")
    .notNull()
    .references(() => contribuyentes.id, { onDelete: "restrict", onUpdate: "cascade" }),
  vigencia: integer("vigencia").notNull(),
  periodo: text("periodo"),
  /** Número de comparendo (opcional). */
  noComparendo: text("no_comparendo"),
  montoCop: numeric("monto_cop", { precision: 15, scale: 2 }).notNull(),
  /** Valor de la multa (COP), opcional; para trazabilidad cuando el total incluye intereses. */
  montoMultaCop: numeric("monto_multa_cop", { precision: 15, scale: 2 }),
  /** Valor de intereses (COP), opcional; para trazabilidad cuando el total incluye intereses. */
  montoInteresesCop: numeric("monto_intereses_cop", { precision: 15, scale: 2 }),
  estadoActual: estadoProcesoEnum("estado_actual").notNull().default("pendiente"),
  asignadoAId: integer("asignado_a_id").references(() => usuarios.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  fechaLimite: date("fecha_limite"),
  /** Tipo de impuesto (catálogo). Opcional para procesos existentes o sin clasificar. */
  impuestoId: uuid("impuesto_id").references(() => impuestos.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  /** Fecha de creación o aplicación del impuesto (origen del proceso) */
  fechaAplicacionImpuesto: date("fecha_aplicacion_impuesto"),
  /** Fecha de creación del registro en el sistema */
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: historial_proceso (tracking)
export const historialProceso = pgTable("historial_proceso", {
  id: serial("id").primaryKey(),
  procesoId: integer("proceso_id")
    .notNull()
    .references(() => procesos.id, { onDelete: "cascade", onUpdate: "cascade" }),
  usuarioId: integer("usuario_id").references(() => usuarios.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  tipoEvento: tipoEventoHistorialEnum("tipo_evento").notNull(),
  estadoAnterior: estadoProcesoEnum("estado_anterior"),
  estadoNuevo: estadoProcesoEnum("estado_nuevo"),
  comentario: text("comentario"),
  /** Solo aplica cuando tipo_evento = 'nota'. Clasifica la nota por etapa. */
  categoriaNota: categoriaDocumentoNotaEnum("categoria_nota"),
  metadata: jsonb("metadata"),
  fecha: timestamp("fecha", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: documentos_proceso (adjuntos almacenados en sistema de archivos local)
export const documentosProceso = pgTable("documentos_proceso", {
  id: serial("id").primaryKey(),
  procesoId: integer("proceso_id")
    .notNull()
    .references(() => procesos.id, { onDelete: "cascade", onUpdate: "cascade" }),
  /** Usuario que subió el documento (opcional; null para documentos antiguos) */
  subidoPorId: integer("subido_por_id").references(() => usuarios.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  /** Clasificación del documento: general, en_contacto, acuerdo_pago, cobro_coactivo */
  categoria: categoriaDocumentoNotaEnum("categoria").notNull().default("general"),
  /** Tipo de documento para trazabilidad (Mandamiento de pago, Medidas cautelares, etc.). */
  tipoDocumento: tipoDocumentoProcesoEnum("tipo_documento").notNull().default("otro"),
  nombreOriginal: text("nombre_original").notNull(),
  rutaArchivo: text("ruta_archivo").notNull(),
  mimeType: text("mime_type").notNull(),
  tamano: integer("tamano").notNull(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: ordenes_resolucion (1:1 con proceso; número + documento adjunto)
export const ordenesResolucion = pgTable(
  "ordenes_resolucion",
  {
    id: serial("id").primaryKey(),
    procesoId: integer("proceso_id")
      .notNull()
      .references(() => procesos.id, { onDelete: "cascade", onUpdate: "cascade" }),
    numeroResolucion: text("numero_resolucion").notNull(),
    fechaResolucion: date("fecha_resolucion"),
    /** Código de la infracción asociada a la resolución. */
    codigoInfraccion: text("codigo_infraccion"),
    /** Tipo de resolución: Sanción o Resumen AP. */
    tipoResolucion: tipoResolucionEnum("tipo_resolucion"),
    rutaArchivo: text("ruta_archivo"),
    nombreOriginal: text("nombre_original"),
    mimeType: text("mime_type"),
    tamano: integer("tamano"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.procesoId)]
);

// Tabla: acuerdos_pago (N:1 con proceso; un proceso puede tener varios acuerdos)
export const acuerdosPago = pgTable("acuerdos_pago", {
  id: serial("id").primaryKey(),
  procesoId: integer("proceso_id")
    .notNull()
    .references(() => procesos.id, { onDelete: "cascade", onUpdate: "cascade" }),
  numeroAcuerdo: text("numero_acuerdo").notNull(),
  fechaAcuerdo: date("fecha_acuerdo"),
  fechaInicio: date("fecha_inicio"),
  /** Número de cuotas del acuerdo (obligatorio para la gestión). */
  cuotas: integer("cuotas").notNull(),
  /** Porcentaje del total que se paga en la cuota inicial (0–100). */
  porcentajeCuotaInicial: numeric("porcentaje_cuota_inicial", { precision: 5, scale: 2 }).notNull(),
  /** Día del mes (1–31) en que se realiza el cobro de cada cuota. */
  diaCobroMes: integer("dia_cobro_mes").notNull(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: cobros_coactivos (1:N con proceso — un proceso puede tener múltiples cobros coactivos)
export const cobrosCoactivos = pgTable("cobros_coactivos", {
  id: serial("id").primaryKey(),
  procesoId: integer("proceso_id")
    .notNull()
    .references(() => procesos.id, { onDelete: "cascade", onUpdate: "cascade" }),
  /** Número/referencia del cobro coactivo en el sistema externo. */
  noCoactivo: text("no_coactivo"),
  /** Fecha del cobro coactivo (sistema externo). */
  fechaInicio: date("fecha_inicio").notNull(),
  /** true si este es el cobro coactivo vigente del proceso. */
  activo: boolean("activo").default(true).notNull(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
});

export type Proceso = typeof procesos.$inferSelect;
export type NewProceso = typeof procesos.$inferInsert;
export type HistorialProceso = typeof historialProceso.$inferSelect;
export type NewHistorialProceso = typeof historialProceso.$inferInsert;
export type DocumentoProceso = typeof documentosProceso.$inferSelect;
export type NewDocumentoProceso = typeof documentosProceso.$inferInsert;
export type OrdenResolucion = typeof ordenesResolucion.$inferSelect;
export type NewOrdenResolucion = typeof ordenesResolucion.$inferInsert;
export type AcuerdoPago = typeof acuerdosPago.$inferSelect;
export type NewAcuerdoPago = typeof acuerdosPago.$inferInsert;
export type CobroCoactivo = typeof cobrosCoactivos.$inferSelect;
export type NewCobroCoactivo = typeof cobrosCoactivos.$inferInsert;
