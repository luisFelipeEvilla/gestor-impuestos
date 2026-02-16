/**
 * Seed inicial de obligaciones (OBLIGACIÓN).
 * Solo inserta si la tabla obligaciones está vacía.
 *
 * Uso: pnpm run db:seed-obligaciones
 * Requiere: DATABASE_URL en .env
 */
import "dotenv/config";
import { db } from "../lib/db";
import { obligaciones } from "../lib/db/schema";
import { count } from "drizzle-orm";

const OBLIGACIONES_INICIALES: { descripcion: string; orden: number }[] = [
  { descripcion: "Actualizar y apoyar la Implementación del Plan Estratégico y Operativo de Gestión Tributaria.", orden: 1 },
  { descripcion: "Apoyar las actuaciones correspondientes a las diferentes etapas de los procesos de Cobro Coactivo en virtud del impago de las obligaciones tributarias.", orden: 2 },
  { descripcion: "Brindar apoyo para la identificación y actualización de la Cartera Morosa por Concepto de los Impuestos objeto de fiscalización del Departamento.", orden: 3 },
  { descripcion: "Apoyar el seguimiento y control a la Base de Contribuyentes de sobre tasa a la Gasolina y ACPM.", orden: 4 },
  { descripcion: "Apoyar la implementación y puesta en marcha los programas de fiscalización, discusión, y recaudo efectivo de tributos.", orden: 5 },
  { descripcion: "Asesorar en la ejecución y articulación de políticas para el fortalecimiento de la cultura tributaria.", orden: 6 },
  { descripcion: "Diseñar y apoyar la ejecución de programas de recaudo efectivo por concepto de multas y contravenciones de tránsito (comparendos manuales) - Vigencias anteriores y Corriente.", orden: 7 },
  { descripcion: "Apoyar la Implementación del Programa Masivo de Cobro Persuasivo y Coactivo.", orden: 8 },
  { descripcion: "Apoyar la creación y capacitación del Grupo Interno de Estampillas (Fiscalización y Cobranzas) de la Gobernación del Magdalena.", orden: 9 },
];

async function main(): Promise<void> {
  const [result] = await db.select({ count: count() }).from(obligaciones);
  if (result.count > 0) {
    console.log(`Tabla obligaciones ya tiene ${result.count} registros. No se inserta nada.`);
    process.exit(0);
    return;
  }
  await db.insert(obligaciones).values(OBLIGACIONES_INICIALES);
  console.log(`Insertadas ${OBLIGACIONES_INICIALES.length} obligaciones.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
