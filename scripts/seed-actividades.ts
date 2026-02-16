/**
 * Seed inicial de actividades de Gestión Tributaria y Cobro Coactivo.
 * Solo inserta si la tabla actividades está vacía.
 *
 * Uso: pnpm run db:seed-actividades
 * Requiere: DATABASE_URL en .env
 */
import "dotenv/config";
import { db } from "../lib/db";
import { actividades } from "../lib/db/schema";
import { count } from "drizzle-orm";

const ACTIVIDADES_INICIALES: { codigo: string; descripcion: string; orden: number }[] = [
  { codigo: "1.1", descripcion: "Realizar un diagnóstico de la proyección del plan Estratégico y Operativo de Gestión Tributaria.", orden: 1 },
  { codigo: "1.2", descripcion: "Acompañar la ejecución de actividades del plan Estratégico y Operativo de Gestión Tributaria.", orden: 2 },
  { codigo: "1.3", descripcion: "Analizar el comportamiento del recaudo tributario en función de la ejecución de las actividades del plan Estratégico y Operativo de Gestión Tributaria.", orden: 3 },
  { codigo: "2.1", descripcion: "Análisis y depuración de cartera corriente y vencida.", orden: 4 },
  { codigo: "2.2", descripcion: "Sustanciar actos administrativos previos a la gestión de cobro coactivo.", orden: 5 },
  { codigo: "2.3", descripcion: "Acompañar en la conformación de los expedientes del proceso de cobro coactivo, a través de la sustanciación de los diferentes actos que debe proferir la administración tributaria para tal fin.", orden: 6 },
  { codigo: "3.1", descripcion: "Acompañar los procesos de identificación y ubicación de contribuyentes morosos por Impuestos objeto de fiscalización del Departamento.", orden: 7 },
  { codigo: "4.1", descripcion: "Apoyar las labores de fiscalización tributaria a los responsables de la sobretasa a la gasolina.", orden: 8 },
  { codigo: "4.2", descripcion: "Brindar acompañamiento en las labores de fiscalización IN SITU a los Contribuyentes de Gasolina y ACPM.", orden: 9 },
  { codigo: "5.1", descripcion: "Capacitar al personal asignado para los procesos de fiscalización, discusión, y recaudo efectivo de tributos.", orden: 10 },
  { codigo: "5.2", descripcion: "Brindar orientación y acompañamiento en los procesos de fiscalización, discusión, y recaudo efectivo de tributos.", orden: 11 },
  { codigo: "6.1", descripcion: "Orientar en el diseño de campañas educativas sectoriales de gestión de cobro de los diferentes tributos del departamento de acuerdo con la caracterización de la cartera.", orden: 12 },
  { codigo: "7.1", descripcion: "Sustanciar los mandamientos de pago, resolución de excepciones y recursos, ejecución, medidas cautelares, actuaciones propias del cobro coactivo de las sanciones impuestas y ejecutoriadas.", orden: 13 },
  { codigo: "7.2", descripcion: "Determinar la procedencia de declaratoria de vigencia de las facilidades de pago suscritas, de acuerdo con los criterios establecidos en el Manual de Cartera Departamental.", orden: 14 },
  { codigo: "8.1", descripcion: "Sustanciar de acuerdo a la clasificación y priorización de la cartera de los diferentes tributos los oficios persuasivos que correspondan.", orden: 15 },
  { codigo: "8.2", descripcion: "Orientar al personal del área funcional de Gestión Tributaria y Cobro Coactivo en el proceso de cobro coactivo de los diferentes tributos.", orden: 16 },
  { codigo: "9.1", descripcion: "Orientar al personal del área funcional de Gestión Tributaria y Cobro frente a los aspectos sustanciales y procedimentales que se deben gestionar en el proceso de fiscalización y cobro de Estampillas en la Gobernación del Magdalena.", orden: 17 },
];

async function main(): Promise<void> {
  const [result] = await db.select({ count: count() }).from(actividades);
  if (result.count > 0) {
    console.log(`Tabla actividades ya tiene ${result.count} registros. No se inserta nada.`);
    process.exit(0);
    return;
  }
  await db.insert(actividades).values(ACTIVIDADES_INICIALES);
  console.log(`Insertadas ${ACTIVIDADES_INICIALES.length} actividades.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
