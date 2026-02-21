import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { rolUsuarioEnum } from "./enums";
import { cargosEmpresa } from "./cargos-empresa";

// Tabla: usuarios
export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  passwordHash: text("password_hash"),
  rol: rolUsuarioEnum("rol").notNull().default("empleado"),
  /** Cargo que ocupa el empleado dentro de la compañía (ej. Gerente general, Abogado). */
  cargoId: integer("cargo_id").references(() => cargosEmpresa.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  activo: boolean("activo").notNull().default(true),
  /** Hash del token de recuperación de contraseña (SHA-256). Se limpia al restablecer o al expirar. */
  passwordResetTokenHash: text("password_reset_token_hash"),
  /** Fecha de expiración del token de recuperación (p. ej. 1 hora). */
  passwordResetExpiresAt: timestamp("password_reset_expires_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Usuario = typeof usuarios.$inferSelect;
export type NewUsuario = typeof usuarios.$inferInsert;
