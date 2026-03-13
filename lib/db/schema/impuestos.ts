import {
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  estadoImpuestoEnum,
  tipoPeriodoImpuestoEnum,
  tipoEventoImpuestoEnum,
} from "./enums";
import { contribuyentes } from "./contribuyentes";
import { usuarios } from "./usuarios";
import { vehiculos } from "./vehiculos";

// Tabla: impuestos – proceso fiscal completo por contribuyente
export const impuestos = pgTable("impuestos", {
  id: uuid("id").primaryKey().defaultRandom(),
  contribuyenteId: integer("contribuyente_id")
    .notNull()
    .references(() => contribuyentes.id, { onDelete: "restrict", onUpdate: "cascade" }),
  /** Tipo de tributo (ej. predial, industria_y_comercio, sobretasa_gasolina). */
  tipoImpuesto: text("tipo_impuesto").notNull(),
  /** Año gravable. */
  vigencia: integer("vigencia").notNull(),
  tipoPeriodo: tipoPeriodoImpuestoEnum("tipo_periodo").notNull(),
  /** Número de período dentro del año (ej. "1", "2", "3T", "ANUAL"). */
  periodo: text("periodo"),
  baseGravable: numeric("base_gravable", { precision: 15, scale: 2 }),
  /** Tarifa en proporción (ej. 0.0120 equivale a 1.20 %). */
  tarifa: numeric("tarifa", { precision: 7, scale: 4 }),
  impuestoDeterminado: numeric("impuesto_determinado", { precision: 15, scale: 2 }),
  intereses: numeric("intereses", { precision: 15, scale: 2 }).default("0"),
  sanciones: numeric("sanciones", { precision: 15, scale: 2 }).default("0"),
  descuentos: numeric("descuentos", { precision: 15, scale: 2 }).default("0"),
  totalAPagar: numeric("total_a_pagar", { precision: 15, scale: 2 }),
  estadoActual: estadoImpuestoEnum("estado_actual").notNull().default("pendiente"),
  asignadoAId: integer("asignado_a_id").references(() => usuarios.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  fechaVencimiento: date("fecha_vencimiento"),
  fechaDeclaracion: date("fecha_declaracion"),
  /** FK al vehículo asociado (solo para impuesto vehicular). */
  vehiculoId: integer("vehiculo_id").references(() => vehiculos.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  /** Número de expediente o referencia externa. */
  noExpediente: text("no_expediente"),
  observaciones: text("observaciones"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: historial_impuesto – trazabilidad de cambios
export const historialImpuesto = pgTable("historial_impuesto", {
  id: serial("id").primaryKey(),
  impuestoId: uuid("impuesto_id")
    .notNull()
    .references(() => impuestos.id, { onDelete: "cascade" }),
  usuarioId: integer("usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
  tipoEvento: tipoEventoImpuestoEnum("tipo_evento").notNull(),
  estadoAnterior: text("estado_anterior"),
  estadoNuevo: text("estado_nuevo"),
  comentario: text("comentario"),
  fecha: timestamp("fecha", { withTimezone: true }).defaultNow().notNull(),
});

export type Impuesto = typeof impuestos.$inferSelect;
export type NewImpuesto = typeof impuestos.$inferInsert;
export type HistorialImpuesto = typeof historialImpuesto.$inferSelect;
