import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";

// Tabla: cargos_empresa (cargos de empleados: Gerente general, Abogado, etc.)
export const cargosEmpresa = pgTable("cargos_empresa", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  orden: integer("orden").notNull().default(0),
});

export type CargoEmpresa = typeof cargosEmpresa.$inferSelect;
export type NewCargoEmpresa = typeof cargosEmpresa.$inferInsert;
