/**
 * Script para deduplicar contribuyentes en la base de datos.
 *
 * Identifica pares de contribuyentes con el mismo (tipo_documento, nit),
 * reasigna todos los comparendos al más antiguo (menor ID) y elimina la copia.
 *
 * Uso:
 *   pnpm tsx scripts/deduplicar-contribuyentes.ts             # ejecutar deduplicación
 *   pnpm tsx scripts/deduplicar-contribuyentes.ts --dry-run   # solo mostrar, sin cambios
 */
import "dotenv/config";
import { db } from "../lib/db";
import { sql } from "drizzle-orm";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 1000;

async function main() {
  console.log(DRY_RUN ? "🔍 MODO DRY-RUN — no se aplicarán cambios\n" : "🚀 Iniciando deduplicación de contribuyentes\n");

  // 1. Cargar todos los pares duplicados
  const pares = (await db.execute(sql`
    SELECT
      tipo_documento,
      nit,
      MIN(id) AS keeper_id,
      MAX(id) AS dup_id
    FROM contribuyentes
    GROUP BY tipo_documento, nit
    HAVING COUNT(*) > 1
    ORDER BY tipo_documento, nit
  `)) as unknown as { tipo_documento: string; nit: string; keeper_id: number; dup_id: number }[];

  console.log(`📊 Grupos duplicados encontrados: ${pares.length}`);

  if (pares.length === 0) {
    console.log("✅ No hay duplicados. La base de datos está limpia.");
    return;
  }

  // 2. Estadísticas previas
  const prevStats = (await db.execute(sql`SELECT COUNT(*) as count FROM comparendos`)) as unknown as { count: string }[];
  const totalComparendos = prevStats[0]!.count;
  console.log(`📋 Total comparendos antes: ${totalComparendos}`);

  if (DRY_RUN) {
    console.log("\n📝 Muestra de pares duplicados (primeros 10):");
    console.log("  keeper_id | dup_id | tipo_documento | nit");
    console.log("  " + "-".repeat(55));
    for (const p of pares.slice(0, 10)) {
      console.log(`  ${p.keeper_id.toString().padStart(8)} | ${p.dup_id.toString().padStart(6)} | ${p.tipo_documento.padEnd(18)} | ${p.nit}`);
    }

    const dupIds = pares.map((p) => p.dup_id);
    const dryStats = (await db.execute(sql`
      SELECT COUNT(*) as count FROM comparendos WHERE contribuyente_id = ANY(${sql.raw(`ARRAY[${dupIds.join(",")}]`)}::int[])
    `)) as unknown as { count: string }[];

    console.log(`\n📊 Resumen dry-run:`);
    console.log(`  Contribuyentes a eliminar: ${pares.length}`);
    console.log(`  Comparendos a reasignar:   ${dryStats[0]!.count}`);
    console.log(`\n✅ Dry-run completado. Ejecuta sin --dry-run para aplicar los cambios.`);
    return;
  }

  // 3. Procesar en lotes con operaciones bulk
  let comparendosReasignados = 0;
  let contribuyentesEliminados = 0;
  const totalLotes = Math.ceil(pares.length / BATCH_SIZE);

  for (let i = 0; i < pares.length; i += BATCH_SIZE) {
    const lote = pares.slice(i, i + BATCH_SIZE);
    const loteNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`\r⏳ Lote ${loteNum}/${totalLotes} (${i + lote.length}/${pares.length})...`);

    const keeperIds = lote.map((p) => p.keeper_id);
    const dupIds = lote.map((p) => p.dup_id);

    // Construir VALUES list: (dup_id, keeper_id), ...
    const valuesStr = lote.map((p) => `(${p.dup_id}, ${p.keeper_id})`).join(",");

    await db.transaction(async (tx) => {
      // Bulk UPDATE: reasignar todos los comparendos de los duplicados en una sola query
      const updateResult = await tx.execute(sql.raw(`
        UPDATE comparendos
        SET contribuyente_id = mapping.keeper_id
        FROM (VALUES ${valuesStr}) AS mapping(dup_id, keeper_id)
        WHERE comparendos.contribuyente_id = mapping.dup_id
      `));
      comparendosReasignados += Number((updateResult as unknown as { count: string }).count ?? 0);

      // Bulk DELETE: eliminar todos los duplicados del lote en una sola query
      await tx.execute(sql.raw(`
        DELETE FROM contribuyentes WHERE id = ANY(ARRAY[${dupIds.join(",")}]::int[])
      `));
      contribuyentesEliminados += lote.length;
    });
  }

  console.log(`\n\n✅ Deduplicación completada:`);
  console.log(`  Contribuyentes eliminados: ${contribuyentesEliminados}`);
  console.log(`  Comparendos reasignados:   ${comparendosReasignados}`);

  // 4. Verificación final
  const dupRestantes = (await db.execute(sql`
    SELECT COUNT(*) as count FROM (
      SELECT tipo_documento, nit FROM contribuyentes
      GROUP BY tipo_documento, nit HAVING COUNT(*) > 1
    ) t
  `)) as unknown as { count: string }[];

  const contribFinalRows = (await db.execute(sql`SELECT COUNT(*) as count FROM contribuyentes`)) as unknown as { count: string }[];
  const compFinalRows = (await db.execute(sql`SELECT COUNT(*) as count FROM comparendos`)) as unknown as { count: string }[];

  console.log(`\n📊 Estado final:`);
  console.log(`  Total contribuyentes:        ${contribFinalRows[0]!.count}`);
  console.log(`  Grupos duplicados restantes: ${dupRestantes[0]!.count} (debe ser 0)`);
  console.log(`  Total comparendos:           ${compFinalRows[0]!.count} (debe ser ${totalComparendos})`);

  if (parseInt(dupRestantes[0]!.count) > 0) {
    console.error(`\n⚠️  Aún quedan ${dupRestantes[0]!.count} grupos duplicados. Revisar manualmente.`);
    process.exit(1);
  }

  console.log(`\n✅ Verificación OK — la base de datos está limpia.`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err);
  process.exit(1);
});
