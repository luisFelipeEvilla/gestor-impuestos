/**
 * Actualiza la fecha límite de prescripción de todos los procesos existentes
 * a 3 años (36 meses) desde la base (fecha aplicación o ingreso a cobro coactivo).
 *
 * Uso: pnpm run db:actualizar-fecha-limite-prescripcion
 * Requiere: DATABASE_URL en .env
 */
import "dotenv/config";
import { db } from "../lib/db";
import { procesos, cobrosCoactivos } from "../lib/db/schema";
import { eq } from "drizzle-orm";

const AÑOS_PRESCRIPCION = 3;

function addYears(isoDate: string, years: number): string {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function toDateStr(value: string | Date | null): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const todos = await db
    .select({
      id: procesos.id,
      fechaAplicacionImpuesto: procesos.fechaAplicacionImpuesto,
      fechaLimite: procesos.fechaLimite,
    })
    .from(procesos);

  const cobros = await db
    .select({ procesoId: cobrosCoactivos.procesoId, fechaInicio: cobrosCoactivos.fechaInicio })
    .from(cobrosCoactivos)
    .where(eq(cobrosCoactivos.activo, true));

  const fechaInicioPorProceso = new Map(
    cobros.map((c) => [c.procesoId, toDateStr(c.fechaInicio)] as const)
  );

  let actualizados = 0;
  let sinBase = 0;

  for (const p of todos) {
    const fechaAplicacion = toDateStr(p.fechaAplicacionImpuesto);
    const fechaInicioCoactivo = fechaInicioPorProceso.get(p.id) ?? null;
    const base = fechaInicioCoactivo ?? fechaAplicacion;

    if (base == null) {
      sinBase++;
      continue;
    }

    const nuevaFechaLimite = addYears(base, AÑOS_PRESCRIPCION);
    const fechaLimiteActual = toDateStr(p.fechaLimite);

    if (nuevaFechaLimite !== fechaLimiteActual) {
      await db
        .update(procesos)
        .set({ fechaLimite: nuevaFechaLimite, actualizadoEn: new Date() })
        .where(eq(procesos.id, p.id));
      actualizados++;
    }
  }

  console.log(`Procesos revisados: ${todos.length}`);
  console.log(`Procesos sin fecha base (se omiten): ${sinBase}`);
  console.log(`Procesos actualizados (fecha límite = base + ${AÑOS_PRESCRIPCION} años): ${actualizados}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
