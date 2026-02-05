#!/usr/bin/env node
/**
 * Diagnóstico de conexión a PostgreSQL.
 * Ejecutar: node scripts/check-db.mjs
 * Asegúrate de tener .env con DATABASE_URL.
 */
import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL no está definida en .env");
  process.exit(1);
}

// Ocultar contraseña en el log
const safeUrl = url.replace(/:[^:@]+@/, ":****@");
console.log("Conectando a:", safeUrl);
console.log("");

const sql = postgres(url, { max: 1 });

sql`
  SELECT 1 as ok, current_database() as db, current_user as "user"
`
  .then((rows) => {
    console.log("✅ Conexión correcta:");
    console.log("   Base de datos:", rows[0].db);
    console.log("   Usuario:", rows[0].user);
    return sql.end();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error al conectar:");
    console.error("   Mensaje:", err.message);
    if (err.code) console.error("   Código:", err.code);
    if (err.severity) console.error("   Severity:", err.severity);
    sql.end().then(() => process.exit(1));
  });
