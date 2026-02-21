import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

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

export type Obligacion = typeof obligaciones.$inferSelect;
export type NewObligacion = typeof obligaciones.$inferInsert;
export type Actividad = typeof actividades.$inferSelect;
export type NewActividad = typeof actividades.$inferInsert;
