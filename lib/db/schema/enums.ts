import { pgEnum } from "drizzle-orm/pg-core";

// Enums según definición del proyecto (Colombia)
export const rolUsuarioEnum = pgEnum("rol_usuario", ["admin", "empleado"]);

/** Naturaleza del impuesto: tributario (tributos) o no tributario (tasas, multas, etc.). */
export const naturalezaImpuestoEnum = pgEnum("naturaleza_impuesto", [
  "tributario",
  "no_tributario",
]);

export const tipoDocumentoEnum = pgEnum("tipo_documento", [
  "nit",
  "cedula",
  "cedula_ecuatoriana",
  "cedula_venezolana",
  "cedula_extranjeria",
  "pasaporte",
  "permiso_proteccion_temporal",
  "tarjeta_identidad",
]);

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

/** Categoría de documentos y notas del proceso: general, en_contacto, acuerdo_pago, cobro_coactivo, evidencia_notificacion */
export const categoriaDocumentoNotaEnum = pgEnum("categoria_documento_nota", [
  "general",
  "en_contacto",
  "acuerdo_pago",
  "cobro_coactivo",
  "evidencia_notificacion",
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

/** Tipo de resolución: Sanción o Resumen AP */
export const tipoResolucionEnum = pgEnum("tipo_resolucion", [
  "sancion",
  "resumen_ap",
]);
