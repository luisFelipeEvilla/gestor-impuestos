/**
 * Limpia procesos duplicados por no_comparendo (1 registro por número de comparendo).
 * Excepción: elimina TODOS los procesos con no_comparendo = 'No reportado' para poder subirlos de nuevo.
 *
 * Uso: pnpm exec tsx scripts/limpiar-procesos-duplicados.ts [--dry-run]
 * --dry-run: solo imprime cuántos se eliminarían, no escribe en la BD.
 * Requiere: DATABASE_URL en .env.
 */
import "dotenv/config";
import { db } from "../lib/db";
import { procesos } from "../lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

const NO_REPORTADO = "NO REPORTADO";

type RowNoComparendo = { id: number; no_comparendo: string | null };

/** IDs de procesos con no_comparendo = 'No reportado' (se eliminan todos). */
async function getIdsNoReportado(): Promise<number[]> {
  const rows = await db
    .select({ id: procesos.id })
    .from(procesos)
    .where(eq(procesos.noComparendo, NO_REPORTADO));
  return rows.map((r) => r.id);
}

/** Por cada no_comparendo duplicado (excepto "No reportado"), devuelve los IDs a eliminar (conserva el de menor id). */
async function getIdsDuplicadosPorNoComparendo(): Promise<number[]> {
  const result = await db.execute(sql`
    WITH claves_duplicadas AS (
      SELECT p.no_comparendo
      FROM procesos p
      WHERE (p.no_comparendo IS DISTINCT FROM ${NO_REPORTADO})
      GROUP BY p.no_comparendo
      HAVING COUNT(*) > 1
    )
    SELECT p.id::int AS id, p.no_comparendo
    FROM procesos p
    INNER JOIN claves_duplicadas c
      ON (c.no_comparendo IS NOT DISTINCT FROM p.no_comparendo)
    ORDER BY p.no_comparendo NULLS LAST, p.id
  `);

  const rows: RowNoComparendo[] = Array.isArray(result)
    ? (result as unknown as RowNoComparendo[])
    : ((result as { rows?: RowNoComparendo[] }).rows ?? []);

  const byKey = new Map<string, number[]>();
  for (const r of rows) {
    const key = r.no_comparendo ?? "__null__";
    const list = byKey.get(key) ?? [];
    list.push(r.id);
    byKey.set(key, list);
  }

  const idsToDelete: number[] = [];
  for (const ids of byKey.values()) {
    ids.sort((a, b) => a - b);
    for (let i = 1; i < ids.length; i++) {
      idsToDelete.push(ids[i]!);
    }
  }
  return idsToDelete;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL no está definida en .env");
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    console.log("--- Modo --dry-run: no se modificará la BD ---\n");
  }

  console.log("Buscando procesos a eliminar (todos los procesos)...");
  const [idsNoReportado, idsDuplicados] = await Promise.all([
    getIdsNoReportado(),
    getIdsDuplicadosPorNoComparendo(),
  ]);
  const idsToDelete = [...new Set([...idsNoReportado, ...idsDuplicados])];
  console.log(`  Con no_comparendo = "${NO_REPORTADO}" (todos): ${idsNoReportado.length.toLocaleString()}`);
  console.log(`  Duplicados por no_comparendo (conservando 1 por número): ${idsDuplicados.length.toLocaleString()}`);
  console.log(`Total procesos a eliminar: ${idsToDelete.length.toLocaleString()}`);

  if (idsToDelete.length === 0) {
    console.log("No hay procesos que limpiar.");
    return;
  }

  if (dryRun) {
    console.log("(Ejecuta sin --dry-run para aplicar la limpieza.)");
    return;
  }

  console.log("Eliminando en una transacción...");
  await db.transaction(async (tx) => {
    const BATCH = 5000;
    for (let i = 0; i < idsToDelete.length; i += BATCH) {
      const chunk = idsToDelete.slice(i, i + BATCH);
      await tx.delete(procesos).where(inArray(procesos.id, chunk));
    }
  });
  console.log(`✅ Eliminados ${idsToDelete.length.toLocaleString()} procesos.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌", err);
    process.exit(1);
  });
