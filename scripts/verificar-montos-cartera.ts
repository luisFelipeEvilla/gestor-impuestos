/**
 * Verifica si los montos cuadran: suma(BD Tránsito) + suma(omitidos) = suma(CSV original).
 *
 * Uso: pnpm exec tsx scripts/verificar-montos-cartera.ts [csv-original] [csv-omitidos]
 * - csv-original: CSV completo (p. ej. ReporteCarteraActual.csv). Por defecto: ReporteCarteraActual.csv
 * - csv-omitidos: CSV de omitidos (con columna "motivo"). Si tiene "motivo", solo se suman las filas
 *   con motivo "vigencia_invalida". Puede ser el archivo completo de omitidos o solo vigencia inválida.
 *
 * Cuadre: sum(BD) + sum(todos los omitidos) = sum(CSV). Si pasas solo el archivo de vigencia
 * inválida, no hay cuadre total (falta el resto de omitidos).
 *
 * Requiere: DATABASE_URL en .env.
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import { db } from "../lib/db";
import { impuestos, procesos } from "../lib/db/schema";
import { eq, sql } from "drizzle-orm";

const CSV_ORIGINAL =
  process.argv[2] ? resolve(process.cwd(), process.argv[2]) : resolve(process.cwd(), "ReporteCarteraActual.csv");
const CSV_OMITIDOS = process.argv[3] ? resolve(process.cwd(), process.argv[3]) : null;

const IMPUESTO_NOMBRE_TRANSITO = "Comparendos de tránsito";

function normalizarHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function limpia(val: string): string {
  return val.replace(/^'/, "").trim();
}

function parseLine(line: string): string[] {
  const raw = line.trim().replace(/^'|';?\s*$/g, "");
  return raw.split(";").map((cell) => limpia(cell));
}

/** Parsea CSV y devuelve índice de Valor Deuda, Valor Multa y opcionalmente Motivo (normalizados). */
function getValorColumnIndices(headerLine: string): {
  valorDeuda: number;
  valorMulta: number;
  motivo: number;
} {
  const raw = parseLine(headerLine);
  const header = raw.map((cell) => normalizarHeader(cell));
  return {
    valorDeuda: header.indexOf("Valor Deuda"),
    valorMulta: header.indexOf("Valor Multa"),
    motivo: header.indexOf("motivo"),
  };
}

function montoDesdeCeldas(cells: string[], valorDeuda: number, valorMulta: number): number {
  const vDeuda = valorDeuda >= 0 && cells[valorDeuda] !== undefined ? cells[valorDeuda]! : "";
  const vMulta = valorMulta >= 0 && cells[valorMulta] !== undefined ? cells[valorMulta]! : "";
  const montoStr = vDeuda || vMulta || "0";
  const montoNum = parseFloat(montoStr.replace(/,/g, "."));
  return Number.isNaN(montoNum) || montoNum < 0 ? 0 : montoNum;
}

/** Suma montos de un CSV usando Valor Deuda || Valor Multa (misma lógica que la importación). */
function sumarMontosCsv(filePath: string): { suma: number; filas: number } {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { suma: 0, filas: 0 };

  const { valorDeuda, valorMulta } = getValorColumnIndices(lines[0]!);
  let suma = 0;
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]!);
    suma += montoDesdeCeldas(cells, valorDeuda, valorMulta);
  }
  return { suma, filas: lines.length - 1 };
}

/**
 * Suma montos del CSV de omitidos. Si tiene columna "motivo", solo suma filas con motivo
 * "vigencia_invalida". Devuelve también la suma de todos los omitidos para el cuadre cuando aplica.
 */
function sumarMontosOmitidos(filePath: string): {
  sumaVigenciaSolo: number;
  sumaTodos: number;
  filasVigencia: number;
  filasTotal: number;
  tieneMotivo: boolean;
} {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { sumaVigenciaSolo: 0, sumaTodos: 0, filasVigencia: 0, filasTotal: 0, tieneMotivo: false };
  }

  const { valorDeuda, valorMulta, motivo } = getValorColumnIndices(lines[0]!);
  const tieneMotivo = motivo >= 0;
  let sumaVigenciaSolo = 0;
  let sumaTodos = 0;
  let filasVigencia = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]!);
    const monto = montoDesdeCeldas(cells, valorDeuda, valorMulta);
    sumaTodos += monto;
    if (tieneMotivo) {
      const valorMotivo = (cells[motivo] ?? "").replace(/^"|"$/g, "").trim();
      if (valorMotivo === "vigencia_invalida") {
        sumaVigenciaSolo += monto;
        filasVigencia++;
      }
    } else {
      sumaVigenciaSolo += monto;
      filasVigencia++;
    }
  }

  return {
    sumaVigenciaSolo: tieneMotivo ? sumaVigenciaSolo : sumaTodos,
    sumaTodos,
    filasVigencia: tieneMotivo ? filasVigencia : lines.length - 1,
    filasTotal: lines.length - 1,
    tieneMotivo,
  };
}

async function sumarMontosBdTransito(): Promise<{ suma: number; cantidad: number }> {
  const [impuesto] = await db
    .select({ id: impuestos.id })
    .from(impuestos)
    .where(eq(impuestos.nombre, IMPUESTO_NOMBRE_TRANSITO));
  if (!impuesto) {
    return { suma: 0, cantidad: 0 };
  }

  const [row] = await db
    .select({
      suma: sql<string>`COALESCE(SUM(${procesos.montoCop}), 0)`,
      cantidad: sql<number>`COUNT(*)::int`,
    })
    .from(procesos)
    .where(eq(procesos.impuestoId, impuesto.id));
  if (!row) return { suma: 0, cantidad: 0 };
  const suma = parseFloat(String(row.suma ?? "0"));
  const cantidad = Number(row.cantidad ?? 0);
  return { suma, cantidad };
}

async function main() {
  console.log("📄 CSV original:", CSV_ORIGINAL);
  let sumOriginal: number;
  let filasOriginal: number;
  try {
    const orig = sumarMontosCsv(CSV_ORIGINAL);
    sumOriginal = orig.suma;
    filasOriginal = orig.filas;
    console.log(`   Suma montos: ${sumOriginal.toLocaleString("es-CO", { minimumFractionDigits: 2 })} (${filasOriginal} filas)`);
  } catch (e) {
    console.error("   No se pudo leer el CSV original:", e);
    process.exit(1);
  }

  const bd = await sumarMontosBdTransito();
  console.log(
    `\n🗄️  BD (Tránsito): suma = ${bd.suma.toLocaleString("es-CO", { minimumFractionDigits: 2 })} (${bd.cantidad} procesos)`
  );

  let sumOmitidosVigencia = 0;
  let sumOmitidosTodos = 0;
  let filasOmitidosVigencia = 0;
  let filasOmitidosTotal = 0;
  let tieneArchivoOmitidos = false;

  if (CSV_OMITIDOS) {
    console.log("\n📄 CSV omitidos:", CSV_OMITIDOS);
    try {
      const omit = sumarMontosOmitidos(CSV_OMITIDOS);
      sumOmitidosVigencia = omit.sumaVigenciaSolo;
      sumOmitidosTodos = omit.sumaTodos;
      filasOmitidosVigencia = omit.filasVigencia;
      filasOmitidosTotal = omit.filasTotal;
      tieneArchivoOmitidos = true;
      console.log(
        `   Suma montos (solo vigencia inválida): ${sumOmitidosVigencia.toLocaleString("es-CO", { minimumFractionDigits: 2 })} (${filasOmitidosVigencia} filas)`
      );
      if (omit.tieneMotivo && omit.filasTotal > omit.filasVigencia) {
        console.log(
          `   Suma montos (todos los omitidos):     ${sumOmitidosTodos.toLocaleString("es-CO", { minimumFractionDigits: 2 })} (${filasOmitidosTotal} filas, para cuadre)`
        );
      }
    } catch (e) {
      console.warn("   No se pudo leer el CSV de omitidos:", e);
    }
  } else {
    console.log("\n⚠️  No se pasó CSV de omitidos. Para comprobar cuadre use: script csv-original csv-omitidos");
  }

  const sumaBdMasVigencia = bd.suma + sumOmitidosVigencia;
  const sumaBdMasTodosOmitidos = bd.suma + sumOmitidosTodos;
  const diffCuadre = Math.abs(sumOriginal - sumaBdMasTodosOmitidos);
  const tolerancia = 0.02; // 2 centavos por redondeos
  const cuadra = tieneArchivoOmitidos && diffCuadre <= tolerancia;

  console.log("\n--- Cuadre ---");
  console.log(`   Suma CSV original:              ${sumOriginal.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`);
  console.log(`   Suma BD + omitidos (vigencia):   ${sumaBdMasVigencia.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`);
  if (filasOmitidosTotal > filasOmitidosVigencia) {
    console.log(`   Suma BD + omitidos (todos):      ${sumaBdMasTodosOmitidos.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`);
    console.log(`   Diferencia (cuadre con todos):   ${diffCuadre.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`);
  } else {
    console.log(`   Diferencia con CSV:              ${(sumOriginal - sumaBdMasVigencia).toLocaleString("es-CO", { minimumFractionDigits: 2 })} (omitidos por otros motivos no incluidos)`);
  }
  if (cuadra) {
    console.log("   ✅ Los montos cuadran (BD + todos los omitidos = CSV).");
  } else if (tieneArchivoOmitidos && filasOmitidosTotal > filasOmitidosVigencia) {
    console.log("   ❌ Los montos NO cuadran (revisar diferencias).");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌", err);
    process.exit(1);
  });
