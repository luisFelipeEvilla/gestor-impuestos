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
  unique,
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

/** Estado del acta de reunión */
export const estadoActaEnum = pgEnum("estado_acta", [
  "borrador",
  "pendiente_aprobacion",
  "aprobada",
  "enviada",
]);

/** Tipo de evento en el historial del acta */
export const tipoEventoActaEnum = pgEnum("tipo_evento_acta", [
  "creacion",
  "edicion",
  "envio_aprobacion",
  "aprobacion",
  "rechazo_participante",
  "envio_correo",
]);

/** Tipo de integrante del acta: empleado/asistente propio o miembro externo */
export const tipoIntegranteActaEnum = pgEnum("tipo_integrante_acta", [
  "interno",
  "externo",
]);

/** Estado de seguimiento del compromiso del acta */
export const estadoCompromisoActaEnum = pgEnum("estado_compromiso_acta", [
  "pendiente",
  "cumplido",
  "no_cumplido",
]);

// Tabla: usuarios
export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  passwordHash: text("password_hash"),
  rol: rolUsuarioEnum("rol").notNull().default("empleado"),
  /** Cargo que ocupa el empleado dentro de la compañía (ej. Gerente general, Abogado). */
  cargoId: integer("cargo_id").references(() => cargosEmpresa.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  activo: boolean("activo").notNull().default(true),
  /** Hash del token de recuperación de contraseña (SHA-256). Se limpia al restablecer o al expirar. */
  passwordResetTokenHash: text("password_reset_token_hash"),
  /** Fecha de expiración del token de recuperación (p. ej. 1 hora). */
  passwordResetExpiresAt: timestamp("password_reset_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: cargos_empresa (cargos de empleados: Gerente general, Abogado, etc.)
export const cargosEmpresa = pgTable("cargos_empresa", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  orden: integer("orden").notNull().default(0),
});

// Tabla: empresa (datos de nuestra empresa – configuración única)
export const empresa = pgTable("empresa", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  tipoDocumento: tipoDocumentoEnum("tipo_documento").notNull().default("nit"),
  numeroDocumento: text("numero_documento").notNull(),
  direccion: text("direccion"),
  telefonoContacto: text("telefono_contacto"),
  numeroContacto: text("numero_contacto"),
  /** Cargo que aparece en el espacio de firma del PDF del acta (ej. "Gerente general"). */
  cargoFirmanteActas: text("cargo_firmante_actas"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: clientes (ej. Secretaría de Tránsito, Secretaría de Hacienda)
export const clientes = pgTable("clientes", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  codigo: text("codigo").unique(),
  descripcion: text("descripcion"),
  /** Correo de contacto del cliente; al enviar actas por correo también se envía a este correo por defecto. */
  emailContacto: text("email_contacto"),
  /** Nombre del contacto (opcional, para personalizar el correo). */
  nombreContacto: text("nombre_contacto"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: clientes_miembros (miembros/contactos de la empresa del cliente)
export const clientesMiembros = pgTable("clientes_miembros", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id, { onDelete: "cascade", onUpdate: "cascade" }),
  nombre: text("nombre").notNull(),
  email: text("email").notNull(),
  cargo: text("cargo"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: impuestos (catálogo) – cada impuesto pertenece a un cliente
export const impuestos = pgTable("impuestos", {
  id: serial("id").primaryKey(),
  /** Cliente al que pertenece el impuesto (ej. Secretaría de Tránsito). Nullable para migración desde datos existentes. */
  clienteId: integer("cliente_id").references(() => clientes.id, {
    onDelete: "restrict",
    onUpdate: "cascade",
  }),
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

// Tabla: actas_reunion
export const actasReunion = pgTable("actas_reunion", {
  id: serial("id").primaryKey(),
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
  actaId: integer("acta_id")
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
  actaId: integer("acta_id")
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

// Tabla: aprobaciones_acta_participante (respuesta del participante tras envío: aprobación o rechazo)
export const aprobacionesActaParticipante = pgTable(
  "aprobaciones_acta_participante",
  {
    id: serial("id").primaryKey(),
    actaId: integer("acta_id")
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
  actaId: integer("acta_id")
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
  actaId: integer("acta_id")
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

// Tabla: obligaciones (obligaciones de gestión tributaria a las que se vinculan las actividades)
export const obligaciones = pgTable("obligaciones", {
  id: serial("id").primaryKey(),
  descripcion: text("descripcion").notNull(),
  orden: integer("orden").notNull().default(0),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: actividades (catálogo de actividades de gestión tributaria y cobro coactivo)
export const actividades = pgTable("actividades", {
  id: serial("id").primaryKey(),
  obligacionId: integer("obligacion_id").references(() => obligaciones.id, {
    onDelete: "restrict",
    onUpdate: "cascade",
  }),
  codigo: text("codigo").notNull().unique(),
  descripcion: text("descripcion").notNull(),
  orden: integer("orden").notNull().default(0),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: actas_reunion_actividades (N:M acta – actividades desarrolladas en el acta)
export const actasReunionActividades = pgTable(
  "actas_reunion_actividades",
  {
    actaId: integer("acta_id")
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
    actaId: integer("acta_id")
      .notNull()
      .references(() => actasReunion.id, { onDelete: "cascade", onUpdate: "cascade" }),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (t) => [{ primaryKey: { columns: [t.actaId, t.clienteId] } }]
);

// Relaciones Drizzle (para queries con join)
export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  cargo: one(cargosEmpresa, { fields: [usuarios.cargoId], references: [cargosEmpresa.id] }),
  procesosAsignados: many(procesos),
  historiales: many(historialProceso),
  actasCreadas: many(actasReunion),
  historialesActa: many(historialActa),
}));

export const cargosEmpresaRelations = relations(cargosEmpresa, ({ many }) => ({
  usuarios: many(usuarios),
}));

export const empresaRelations = relations(empresa, () => ({}));

export const clientesRelations = relations(clientes, ({ many }) => ({
  impuestos: many(impuestos),
  miembros: many(clientesMiembros),
  actasReunionClientes: many(actasReunionClientes),
}));

export const clientesMiembrosRelations = relations(clientesMiembros, ({ one }) => ({
  cliente: one(clientes),
}));

export const impuestosRelations = relations(impuestos, ({ one, many }) => ({
  cliente: one(clientes, { fields: [impuestos.clienteId], references: [clientes.id] }),
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

export const actasReunionRelations = relations(actasReunion, ({ one, many }) => ({
  creadoPor: one(usuarios, { fields: [actasReunion.creadoPorId], references: [usuarios.id] }),
  aprobadoPor: one(usuarios, { fields: [actasReunion.aprobadoPorId], references: [usuarios.id] }),
  integrantes: many(actasIntegrantes),
  compromisos: many(compromisosActa),
  aprobacionesParticipantes: many(aprobacionesActaParticipante),
  documentos: many(documentosActa),
  historial: many(historialActa),
  actasReunionClientes: many(actasReunionClientes),
  actasReunionActividades: many(actasReunionActividades),
}));

export const obligacionesRelations = relations(obligaciones, ({ many }) => ({
  actividades: many(actividades),
}));

export const actividadesRelations = relations(actividades, ({ one, many }) => ({
  obligacion: one(obligaciones, { fields: [actividades.obligacionId], references: [obligaciones.id] }),
  actasReunionActividades: many(actasReunionActividades),
}));

export const actasReunionActividadesRelations = relations(actasReunionActividades, ({ one }) => ({
  acta: one(actasReunion),
  actividad: one(actividades),
}));

export const actasReunionClientesRelations = relations(actasReunionClientes, ({ one }) => ({
  acta: one(actasReunion),
  cliente: one(clientes),
}));

export const actasIntegrantesRelations = relations(actasIntegrantes, ({ one, many }) => ({
  acta: one(actasReunion),
  usuario: one(usuarios),
  aprobacion: many(aprobacionesActaParticipante),
  compromisosAsignados: many(compromisosActa),
}));

export const compromisosActaRelations = relations(compromisosActa, ({ one, many }) => ({
  acta: one(actasReunion),
  actaIntegrante: one(actasIntegrantes),
  clienteMiembro: one(clientesMiembros),
  actualizadoPor: one(usuarios, { fields: [compromisosActa.actualizadoPorId], references: [usuarios.id] }),
  historial: many(compromisosActaHistorial),
}));

export const compromisosActaHistorialRelations = relations(compromisosActaHistorial, ({ one }) => ({
  compromisoActa: one(compromisosActa),
  creadoPor: one(usuarios, { fields: [compromisosActaHistorial.creadoPorId], references: [usuarios.id] }),
}));

export const aprobacionesActaParticipanteRelations = relations(
  aprobacionesActaParticipante,
  ({ one }) => ({
    acta: one(actasReunion),
    actaIntegrante: one(actasIntegrantes),
  })
);

export const documentosActaRelations = relations(documentosActa, ({ one }) => ({
  acta: one(actasReunion),
}));

export const historialActaRelations = relations(historialActa, ({ one }) => ({
  acta: one(actasReunion),
  usuario: one(usuarios),
}));

// Tipos inferidos para uso en la app
export type Usuario = typeof usuarios.$inferSelect;
export type NewUsuario = typeof usuarios.$inferInsert;
export type CargoEmpresa = typeof cargosEmpresa.$inferSelect;
export type NewCargoEmpresa = typeof cargosEmpresa.$inferInsert;
export type Empresa = typeof empresa.$inferSelect;
export type NewEmpresa = typeof empresa.$inferInsert;
export type Cliente = typeof clientes.$inferSelect;
export type NewCliente = typeof clientes.$inferInsert;
export type ClienteMiembro = typeof clientesMiembros.$inferSelect;
export type NewClienteMiembro = typeof clientesMiembros.$inferInsert;
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
export type ActaReunion = typeof actasReunion.$inferSelect;
export type NewActaReunion = typeof actasReunion.$inferInsert;
export type ActaIntegrante = typeof actasIntegrantes.$inferSelect;
export type NewActaIntegrante = typeof actasIntegrantes.$inferInsert;
export type AprobacionActaParticipante = typeof aprobacionesActaParticipante.$inferSelect;
export type NewAprobacionActaParticipante = typeof aprobacionesActaParticipante.$inferInsert;
export type DocumentoActa = typeof documentosActa.$inferSelect;
export type NewDocumentoActa = typeof documentosActa.$inferInsert;
export type HistorialActa = typeof historialActa.$inferSelect;
export type NewHistorialActa = typeof historialActa.$inferInsert;
export type CompromisoActa = typeof compromisosActa.$inferSelect;
export type NewCompromisoActa = typeof compromisosActa.$inferInsert;
export type CompromisoActaHistorial = typeof compromisosActaHistorial.$inferSelect;
export type NewCompromisoActaHistorial = typeof compromisosActaHistorial.$inferInsert;
export type ActaReunionCliente = typeof actasReunionClientes.$inferSelect;
export type NewActaReunionCliente = typeof actasReunionClientes.$inferInsert;
export type Obligacion = typeof obligaciones.$inferSelect;
export type NewObligacion = typeof obligaciones.$inferInsert;
export type Actividad = typeof actividades.$inferSelect;
export type NewActividad = typeof actividades.$inferInsert;
export type ActaReunionActividad = typeof actasReunionActividades.$inferSelect;
export type NewActaReunionActividad = typeof actasReunionActividades.$inferInsert;
