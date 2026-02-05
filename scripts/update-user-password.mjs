#!/usr/bin/env node
/**
 * Actualiza la contraseña de un usuario por email.
 * También activa el usuario si estaba inactivo.
 *
 * Uso:
 *   node scripts/update-user-password.mjs
 *   node scripts/update-user-password.mjs --email otro@ejemplo.com --password OtraClave123
 *
 * Requiere .env con DATABASE_URL.
 */
import "dotenv/config";
import postgres from "postgres";
import { hashSync } from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL no está definida en .env");
  process.exit(1);
}

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
};

const email = getArg("--email") ?? "levilla@appworks.com.co";
const password = getArg("--password") ?? "Pipe.2002";

const passwordHash = hashSync(password, 10);
const sql = postgres(DATABASE_URL, { max: 1 });

sql`
  UPDATE usuarios
  SET password_hash = ${passwordHash}, activo = true, updated_at = now()
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(${email}))
  RETURNING id, email, nombre, rol, activo
`
  .then((rows) => {
    if (rows.length === 0) {
      console.error("❌ No se encontró ningún usuario con email:", email);
      return sql.end().then(() => process.exit(1));
    }
    const u = rows[0];
    console.log("✅ Usuario actualizado:");
    console.log("   ID:", u.id);
    console.log("   Email:", u.email);
    console.log("   Nombre:", u.nombre);
    console.log("   Rol:", u.rol);
    console.log("   Activo:", u.activo);
    console.log("   Contraseña actualizada correctamente.");
    return sql.end();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error:", err.message);
    sql.end().then(() => process.exit(1));
  });
