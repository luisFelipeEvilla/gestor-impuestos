/**
 * Diagnóstico de procesos duplicados (solo lectura).
 * Clave: no_comparendo (solo debe haber un registro por número de comparendo).
 * Excepción: no_comparendo = 'No reportado' se eliminan todos para poder subirlos de nuevo.
 *
 * Uso: pnpm exec tsx scripts/diagnostico-procesos-duplicados.ts
 * Requiere: DATABASE_URL en .env.
 */
import "dotenv/config";
import { db } from "../lib/db";
import { procesos, impuestos } from "../lib/db/schema";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

const IMPUESTO_NOMBRE_TRANSITO = "Comparendos de tránsito";
const NO_REPORTADO = "NO REPORTADO";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL no está definida en .env");
    process.exit(1);
  }

  const [impuestoRow] = await db
    .select({ id: impuestos.id })
    .from(impuestos)
    .where(eq(impuestos.nombre, IMPUESTO_NOMBRE_TRANSITO));

  if (!impuestoRow) {
    console.error("❌ No se encontró el impuesto:", IMPUESTO_NOMBRE_TRANSITO);
    process.exit(1);
  }

  const impuestoId = impuestoRow.id;
  console.log("--- Diagnóstico por no_comparendo (impuesto Tránsito) ---\n");

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(procesos)
    .where(eq(procesos.impuestoId, impuestoId));
  const totalProcesos = totalRow?.count ?? 0;
  console.log(`Total procesos (impuesto Tránsito): ${totalProcesos.toLocaleString()}`);

  const [noReportadoRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(procesos)
    .where(and(eq(procesos.impuestoId, impuestoId), eq(procesos.noComparendo, NO_REPORTADO)));
  const countNoReportado = noReportadoRow?.count ?? 0;
  console.log(`Procesos con no_comparendo = "${NO_REPORTADO}" (se eliminarán todos para re-subir): ${countNoReportado.toLocaleString()}`);

  type GroupNoComparendo = { no_comparendo: string | null; cnt: number; sobrantes: number };
  const dupResult = await db.execute(sql`
    SELECT
      p.no_comparendo AS no_comparendo,
      COUNT(*)::int AS cnt,
      (COUNT(*) - 1)::int AS sobrantes
    FROM procesos p
    WHERE p.impuesto_id = ${impuestoId}
    GROUP BY p.impuesto_id, p.no_comparendo
    HAVING COUNT(*) > 1
  `);
  const rowsDup: GroupNoComparendo[] = Array.isArray(dupResult)
    ? (dupResult as unknown as GroupNoComparendo[])
    : ((dupResult as { rows?: GroupNoComparendo[] }).rows ?? []);
  const gruposDuplicados = rowsDup.length;
  const sobrantesPorDuplicadoSinNoReportado = rowsDup.reduce(
    (s, r) => s + (r.no_comparendo === NO_REPORTADO ? 0 : Number(r.sobrantes) || 0),
    0
  );
  const sobrantesNoReportado = rowsDup.find((r) => r.no_comparendo === NO_REPORTADO)?.sobrantes ?? 0;

  console.log(`\nGrupos con mismo no_comparendo (duplicados): ${gruposDuplicados.toLocaleString()}`);
  console.log(
    `Registros sobrantes (conservando 1 por no_comparendo): ${rowsDup.reduce((s, r) => s + (Number(r.sobrantes) || 0), 0).toLocaleString()}`
  );

  if (gruposDuplicados > 0) {
    console.log("\n--- Ejemplos (primeros 5) ---");
    for (const r of rowsDup.slice(0, 5)) {
      const noComp = r.no_comparendo ?? "(null)";
      console.log(`  no_comparendo="${noComp.slice(0, 40)}${noComp.length > 40 ? "..." : ""}" cnt=${r.cnt}`);
    }
  }

  const totalAEliminar = countNoReportado + sobrantesPorDuplicadoSinNoReportado;
  console.log(`\n--- Resumen ---`);
  console.log(
    `Total a eliminar: ${totalAEliminar.toLocaleString()} (${countNoReportado.toLocaleString()} "${NO_REPORTADO}" + ${sobrantesPorDuplicadoSinNoReportado.toLocaleString()} duplicados por no_comparendo)`
  );
  if (sobrantesNoReportado > 0) {
    console.log(`  (Los "${NO_REPORTADO}" se eliminan todos; no se conserva uno.)`);
  }
  console.log(`Procesos tras limpieza: ${(totalProcesos - totalAEliminar).toLocaleString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌", err);
    process.exit(1);
  });
