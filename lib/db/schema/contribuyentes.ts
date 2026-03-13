import { pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { tipoDocumentoEnum } from "./enums";

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
}, (table) => ({
  tipoDocNitUnique: unique("contribuyentes_tipo_doc_nit_unique").on(
    table.tipoDocumento,
    table.nit
  ),
}));

export type Contribuyente = typeof contribuyentes.$inferSelect;
export type NewContribuyente = typeof contribuyentes.$inferInsert;
