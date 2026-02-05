import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums según definición del proyecto (Colombia)
export const rolUsuarioEnum = pgEnum("rol_usuario", ["admin", "empleado"]);
export const tipoImpuestoEnum = pgEnum("tipo_impuesto", ["nacional", "municipal"]);
export const tipoDocumentoEnum = pgEnum("tipo_documento", ["nit", "cedula"]);
export const estadoProcesoEnum = pgEnum("estado_proceso", [
  "pendiente",
  "asignado",
  "en_contacto",
  "notificado",
  "en_negociacion",
  "cobrado",
  "incobrable",
  "en_cobro_coactivo",
  "suspendido",
]);
export const tipoEventoHistorialEnum = pgEnum("tipo_evento_historial", [
  "cambio_estado",
  "asignacion",
  "nota",
  "notificacion",
  "pago",
]);

/** Categoría de documentos y notas del proceso: general, en_contacto, acuerdo_pago, cobro_coactivo */
export const categoriaDocumentoNotaEnum = pgEnum("categoria_documento_nota", [
  "general",
  "en_contacto",
  "acuerdo_pago",
  "cobro_coactivo",
]);

// Tabla: usuarios
export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  passwordHash: text("password_hash"),
  rol: rolUsuarioEnum("rol").notNull().default("empleado"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: impuestos (catálogo)
export const impuestos = pgTable("impuestos", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  codigo: text("codigo").notNull().unique(),
  tipo: tipoImpuestoEnum("tipo").notNull(),
  descripcion: text("descripcion"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: contribuyentes (persona final)
export const contribuyentes = pgTable("contribuyentes", {
  id: serial("id").primaryKey(),
  nit: text("nit").notNull(),
  tipoDocumento: tipoDocumentoEnum("tipo_documento").notNull().default("nit"),
  nombreRazonSocial: text("nombre_razon_social").notNull(),
  telefono: text("telefono"),
  email: text("email"),
  direccion: text("direccion"),
  ciudad: text("ciudad"),
  departamento: text("departamento"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: procesos (trabajo de cobro)
export const procesos = pgTable("procesos", {
  id: serial("id").primaryKey(),
  impuestoId: integer("impuesto_id")
    .notNull()
    .references(() => impuestos.id, { onDelete: "restrict", onUpdate: "cascade" }),
  contribuyenteId: integer("contribuyente_id")
    .notNull()
    .references(() => contribuyentes.id, { onDelete: "restrict", onUpdate: "cascade" }),
  vigencia: integer("vigencia").notNull(),
  periodo: text("periodo"),
  montoCop: numeric("monto_cop", { precision: 15, scale: 2 }).notNull(),
  estadoActual: estadoProcesoEnum("estado_actual").notNull().default("pendiente"),
  asignadoAId: integer("asignado_a_id").references(() => usuarios.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  fechaLimite: date("fecha_limite"),
  /** Número de resolución que origina el proceso de cobro */
  numeroResolucion: text("numero_resolucion"),
  /** Fecha de la resolución */
  fechaResolucion: date("fecha_resolucion"),
  /** Fecha de creación o aplicación del impuesto (origen del proceso) */
  fechaAplicacionImpuesto: date("fecha_aplicacion_impuesto"),
  /** Fecha de ingreso a cobro coactivo; si está definida, la prescripción de 5 años se cuenta desde aquí */
  fechaInicioCobroCoactivo: date("fecha_inicio_cobro_coactivo"),
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
  /** Clasificación del documento: general, en_contacto, acuerdo_pago, cobro_coactivo */
  categoria: categoriaDocumentoNotaEnum("categoria").notNull().default("general"),
  nombreOriginal: text("nombre_original").notNull(),
  rutaArchivo: text("ruta_archivo").notNull(),
  mimeType: text("mime_type").notNull(),
  tamano: integer("tamano").notNull(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
});

// Relaciones Drizzle (para queries con join)
export const usuariosRelations = relations(usuarios, ({ many }) => ({
  procesosAsignados: many(procesos),
  historiales: many(historialProceso),
}));

export const impuestosRelations = relations(impuestos, ({ many }) => ({
  procesos: many(procesos),
}));

export const contribuyentesRelations = relations(contribuyentes, ({ many }) => ({
  procesos: many(procesos),
}));

export const procesosRelations = relations(procesos, ({ one, many }) => ({
  impuesto: one(impuestos),
  contribuyente: one(contribuyentes),
  asignadoA: one(usuarios),
  historial: many(historialProceso),
  documentos: many(documentosProceso),
}));

export const historialProcesoRelations = relations(historialProceso, ({ one }) => ({
  proceso: one(procesos),
  usuario: one(usuarios),
}));

export const documentosProcesoRelations = relations(documentosProceso, ({ one }) => ({
  proceso: one(procesos),
}));

// Tipos inferidos para uso en la app
export type Usuario = typeof usuarios.$inferSelect;
export type NewUsuario = typeof usuarios.$inferInsert;
export type Impuesto = typeof impuestos.$inferSelect;
export type NewImpuesto = typeof impuestos.$inferInsert;
export type Contribuyente = typeof contribuyentes.$inferSelect;
export type NewContribuyente = typeof contribuyentes.$inferInsert;
export type Proceso = typeof procesos.$inferSelect;
export type NewProceso = typeof procesos.$inferInsert;
export type HistorialProceso = typeof historialProceso.$inferSelect;
export type NewHistorialProceso = typeof historialProceso.$inferInsert;
export type DocumentoProceso = typeof documentosProceso.$inferSelect;
export type NewDocumentoProceso = typeof documentosProceso.$inferInsert;
