import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Para consultas desde el servidor (Next.js). Evitar crear nueva conexión en cada request en dev.
const globalForDb = globalThis as unknown as { conn: ReturnType<typeof postgres> | undefined };

const conn = globalForDb.conn ?? postgres(connectionString, { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
