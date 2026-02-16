/**
 * Actualiza actividades existentes asignando obligacion_id según el código de la actividad.
 * Ejecutar después de seed-obligaciones y de tener la tabla obligaciones poblada.
 *
 * Uso: pnpm run db:update-actividades-obligaciones
 * Requiere: DATABASE_URL en .env
 */
import "dotenv/config";
import { db } from "../lib/db";
import { actividades, obligaciones } from "../lib/db/schema";
import { eq } from "drizzle-orm";

/** Mapeo codigo actividad -> orden de obligación (1-9). */
const CODIGO_A_ORDEN_OBLIGACION: Record<string, number> = {
  "1.1": 1,
  "1.2": 1,
  "1.3": 1,
  "2.1": 2,
  "2.2": 2,
  "2.3": 2,
  "7.1": 2,
  "7.2": 2,
  "3.1": 3,
  "4.1": 4,
  "4.2": 4,
  "5.1": 5,
  "5.2": 5,
  "6.1": 6,
  "8.1": 8,
  "8.2": 8,
  "9.1": 9,
};

async function main(): Promise<void> {
  const obligacionesRows = await db.select({ id: obligaciones.id, orden: obligaciones.orden }).from(obligaciones);
  const ordenToId = new Map(obligacionesRows.map((o) => [o.orden, o.id]));

  const actividadesRows = await db.select({ id: actividades.id, codigo: actividades.codigo }).from(actividades);
  let updated = 0;
  for (const a of actividadesRows) {
    const ordenObligacion = CODIGO_A_ORDEN_OBLIGACION[a.codigo];
    if (ordenObligacion == null) {
      console.warn(`Actividad ${a.codigo} (id ${a.id}) sin obligación asignada (orden 7 sin actividades en catálogo).`);
      continue;
    }
    const obligacionId = ordenToId.get(ordenObligacion);
    if (!obligacionId) {
      console.warn(`Obligación con orden ${ordenObligacion} no encontrada.`);
      continue;
    }
    await db.update(actividades).set({ obligacionId, updatedAt: new Date() }).where(eq(actividades.id, a.id));
    updated++;
  }
  console.log(`Actualizadas ${updated} actividades con obligacion_id.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
