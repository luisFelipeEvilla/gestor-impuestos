import { integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { contribuyentes } from "./contribuyentes";

// Tabla: vehiculos – vehículos asociados a un contribuyente
export const vehiculos = pgTable(
  "vehiculos",
  {
    id: serial("id").primaryKey(),
    contribuyenteId: integer("contribuyente_id")
      .references(() => contribuyentes.id, { onDelete: "restrict", onUpdate: "cascade" }),
    placa: text("placa").notNull(),
    /** Año modelo del vehículo. */
    modelo: integer("modelo"),
    /** Clase del vehículo (ej. AUTOMOVIL, MOTOCICLETA). */
    clase: text("clase"),
    marca: text("marca"),
    linea: text("linea"),
    cilindraje: integer("cilindraje"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    placaUnique: unique("vehiculos_placa_unique").on(table.placa),
  })
);

export type Vehiculo = typeof vehiculos.$inferSelect;
export type NewVehiculo = typeof vehiculos.$inferInsert;
