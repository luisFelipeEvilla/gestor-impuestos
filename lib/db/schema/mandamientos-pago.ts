import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { procesos } from "./procesos";
import { usuarios } from "./usuarios";

export const mandamientosPago = pgTable("mandamientos_pago", {
  id: serial("id").primaryKey(),
  procesoId: integer("proceso_id")
    .notNull()
    .references(() => procesos.id, { onDelete: "cascade" }),
  generadoPorId: integer("generado_por_id").references(() => usuarios.id, {
    onDelete: "set null",
  }),
  /** Placa del vehículo ingresada al generar el mandamiento */
  vehiculoPlaca: text("vehiculo_placa"),
  /** Número de resolución ingresado al generar el mandamiento */
  numeroResolucion: text("numero_resolucion"),
  /** Ruta relativa al archivo PDF, ej: procesos/123/uuid.pdf */
  rutaArchivo: text("ruta_archivo").notNull(),
  nombreOriginal: text("nombre_original").notNull(),
  tamano: integer("tamano").notNull(),
  firmadoPorId: integer("firmado_por_id").references(() => usuarios.id, {
    onDelete: "set null",
  }),
  firmadoEn: timestamp("firmado_en", { withTimezone: true }),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
});

export type MandamientoPago = typeof mandamientosPago.$inferSelect;
export type NewMandamientoPago = typeof mandamientosPago.$inferInsert;
