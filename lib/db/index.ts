import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL no está definida. En Vercel: Settings → Environment Variables → DATABASE_URL (Production)."
  );
}

// Opciones para Supabase pooler (puerto 6543) y entornos serverless (Vercel).
// prepare: false es obligatorio con el pooler en modo transacción.
// ssl: 'require' evita fallos de conexión en producción.
const isSupabase =
  connectionString.includes("supabase.com") || connectionString.includes("supabase.co");

const postgresOptions = {
  max: process.env.NODE_ENV === "production" ? 2 : 10,
  prepare: isSupabase ? false : true,
  ...(isSupabase && { ssl: "require" as const }),
};

const globalForDb = globalThis as unknown as { conn: ReturnType<typeof postgres> | undefined };

const conn = globalForDb.conn ?? postgres(connectionString, postgresOptions);
if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
