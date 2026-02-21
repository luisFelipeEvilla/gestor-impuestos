import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { naturalezaImpuestoEnum } from "./enums";
import { clientes } from "./clientes";

// Tabla: impuestos (catálogo) – cada impuesto pertenece a un cliente
export const impuestos = pgTable("impuestos", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Cliente al que pertenece el impuesto (ej. Secretaría de Tránsito). Nullable para migración desde datos existentes. */
  clienteId: integer("cliente_id").references(() => clientes.id, {
    onDelete: "restrict",
    onUpdate: "cascade",
  }),
  nombre: text("nombre").notNull(),
  /** Tributario (tributos) o No tributario (tasas, multas, contribuciones no tributarias). */
  naturaleza: naturalezaImpuestoEnum("naturaleza").notNull().default("tributario"),
  /** Tiempo de prescripción en meses (opcional). */
  prescripcionMeses: integer("prescripcion_meses"),
  descripcion: text("descripcion"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Impuesto = typeof impuestos.$inferSelect;
export type NewImpuesto = typeof impuestos.$inferInsert;
