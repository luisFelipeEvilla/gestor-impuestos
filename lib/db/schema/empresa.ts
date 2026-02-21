import {
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { tipoDocumentoEnum } from "./enums";

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

export type Empresa = typeof empresa.$inferSelect;
export type NewEmpresa = typeof empresa.$inferInsert;
