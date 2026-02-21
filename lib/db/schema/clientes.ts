import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Tabla: clientes (ej. Secretaría de Tránsito, Secretaría de Hacienda)
export const clientes = pgTable("clientes", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  codigo: text("codigo").unique(),
  descripcion: text("descripcion"),
  /** Correo de contacto del cliente; al enviar actas por correo también se envía a este correo por defecto. */
  emailContacto: text("email_contacto"),
  /** Nombre del contacto (opcional, para personalizar el correo). */
  nombreContacto: text("nombre_contacto"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabla: clientes_miembros (miembros/contactos de la empresa del cliente)
export const clientesMiembros = pgTable("clientes_miembros", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id, { onDelete: "cascade", onUpdate: "cascade" }),
  nombre: text("nombre").notNull(),
  email: text("email").notNull(),
  cargo: text("cargo"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Cliente = typeof clientes.$inferSelect;
export type NewCliente = typeof clientes.$inferInsert;
export type ClienteMiembro = typeof clientesMiembros.$inferSelect;
export type NewClienteMiembro = typeof clientesMiembros.$inferInsert;
