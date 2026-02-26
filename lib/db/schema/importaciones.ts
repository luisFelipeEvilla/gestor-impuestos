import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usuarios } from "./usuarios";

// Tabla: importaciones_procesos (registro de cada importación masiva de procesos)
export const importacionesProcesos = pgTable("importaciones_procesos", {
  id: serial("id").primaryKey(),
  /** Nombre original del archivo subido (CSV o Excel). */
  nombreArchivo: text("nombre_archivo").notNull(),
  /** Usuario administrador que realizó la importación. */
  usuarioId: integer("usuario_id").references(() => usuarios.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  /** Total de filas en el archivo (excluye cabecera). */
  totalRegistros: integer("total_registros").notNull().default(0),
  /** Procesos insertados exitosamente. */
  exitosos: integer("exitosos").notNull().default(0),
  /** Filas que fallaron por error en BD (lotes fallidos). */
  fallidos: integer("fallidos").notNull().default(0),
  /** Filas omitidas (duplicados, vigencia inválida, etc.). */
  omitidos: integer("omitidos").notNull().default(0),
  /** Estado de la importación: procesando | completado | completado_con_errores | fallido */
  estado: text("estado").notNull().default("procesando"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
});

export type ImportacionProcesos = typeof importacionesProcesos.$inferSelect;
export type NewImportacionProcesos = typeof importacionesProcesos.$inferInsert;
