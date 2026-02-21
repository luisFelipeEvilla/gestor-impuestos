/**
 * Compara registros del CSV de cartera con la BD y el archivo de vigencia inválida
 * para localizar por qué sum(BD) + sum(vigencia) ≠ sum(CSV).
 *
 * Uso: pnpm exec tsx scripts/comparar-cartera-db-csv.ts [csv-original] [csv-vigencia-invalida]
 *
 * Requiere: DATABASE_URL en .env.
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import { db } from "../lib/db";
import { contribuyentes, procesos } from "../lib/db/schema";
import { eq } from "drizzle-orm";

const CSV_ORIGINAL =
  process.argv[2] ? resolve(process.cwd(), process.argv[2]) : resolve(process.cwd(), "ReporteCarteraActual.csv");
const CSV_VIGENCIA =
  process.argv[3]
    ? resolve(process.cwd(), process.argv[3])
    : resolve(process.cwd(), "import-cartera-vigencia-invalida-2026-02-21-12-15-15.csv");

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

function parseFechaCsv(value: string): string | null {
  const trimmed = value.replace(/^'|'$/g, "").trim();
  if (!trimmed) return null;
  const parts = trimmed.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  let year = parseInt(y!, 10);
  if (year < 100) year += year < 50 ? 2000 : 1900;
  const month = parseInt(m!, 10);
  const day = parseInt(d!, 10);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  )
    return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(iso + "T12:00:00Z");
  return Number.isNaN(date.getTime()) ? null : iso;
}

function buildIdempotenciaKey(
  noComparendo: string | null,
  fechaAplicacion: string | null,
  montoCop: string,
  noDocumentoInfractor: string
): string {
  const noComp = (noComparendo ?? "").trim();
  const fecha = fechaAplicacion ?? "";
  const doc = (noDocumentoInfractor ?? "").trim();
  return `${noComp}|${fecha}|${montoCop}|${doc}`;
}

interface CsvRowKey {
  key: string;
  monto: number;
  linea: number;
  nroComparendo: string;
  identificacion: string;
}

function getColumnIndices(headerLine: string) {
  const raw = parseLine(headerLine);
  const header = raw.map((cell) => normalizarHeader(cell));
  return {
    nroComparendo: header.indexOf("Nro Comparendo"),
    fechaComparendo: header.indexOf("Fecha Comparendo"),
    fechaResolucion: header.indexOf("Fecha Resolucion"),
    identificacion: header.indexOf("Identificacion Infractor"),
    valorDeuda: header.indexOf("Valor Deuda"),
    valorMulta: header.indexOf("Valor Multa"),
  };
}

function parseCsvToKeys(filePath: string): CsvRowKey[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const idx = getColumnIndices(lines[0]!);
  const rows: CsvRowKey[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]!);
    const get = (k: keyof typeof idx) => (idx[k] >= 0 && cells[idx[k]] !== undefined ? cells[idx[k]]! : "");
    const fechaComparendo = parseFechaCsv(get("fechaComparendo"));
    const fechaResolucion = parseFechaCsv(get("fechaResolucion"));
    const fechaAplicacion = fechaComparendo ?? fechaResolucion ?? null;
    const montoStr = get("valorDeuda") || get("valorMulta") || "0";
    const montoNum = parseFloat(montoStr.replace(/,/g, "."));
    const montoCop = Number.isNaN(montoNum) || montoNum < 0 ? "0.00" : montoNum.toFixed(2);
    const noComparendo = get("nroComparendo").trim() ? limpia(get("nroComparendo")) : null;
    const nit = (get("identificacion") ?? "").trim();
    const key = buildIdempotenciaKey(noComparendo, fechaAplicacion, montoCop, nit);
    const monto = Number.isNaN(montoNum) || montoNum < 0 ? 0 : montoNum;
    rows.push({
      key,
      monto,
      linea: i + 1,
      nroComparendo: get("nroComparendo"),
      identificacion: nit,
    });
  }
  return rows;
}

/** Carga desde BD: clave de idempotencia -> monto (normalizado a 2 decimales). Todos los procesos. */
async function loadBdKeysMontos(): Promise<Map<string, number>> {
  const rows = await db
    .select({
      noComparendo: procesos.noComparendo,
      fechaAplicacionImpuesto: procesos.fechaAplicacionImpuesto,
      montoCop: procesos.montoCop,
      nit: contribuyentes.nit,
    })
    .from(procesos)
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id));

  const map = new Map<string, number>();
  for (const r of rows) {
    const montoStr = String(r.montoCop ?? "0");
    const montoNormalized = (parseFloat(montoStr) || 0).toFixed(2);
    const key = buildIdempotenciaKey(
      r.noComparendo,
      r.fechaAplicacionImpuesto,
      montoNormalized,
      r.nit ?? ""
    );
    map.set(key, parseFloat(montoStr) || 0);
  }
  return map;
}

async function main() {
  console.log("📄 CSV original:", CSV_ORIGINAL);
  console.log("📄 CSV vigencia inválida:", CSV_VIGENCIA);

  const csvRows = parseCsvToKeys(CSV_ORIGINAL);
  const vigenciaRows = parseCsvToKeys(CSV_VIGENCIA);

  const vigenciaKeys = new Set(vigenciaRows.map((r) => r.key));
  const sumVigencia = vigenciaRows.reduce((s, r) => s + r.monto, 0);

  const bdMap = await loadBdKeysMontos();
  const sumBd = [...bdMap.values()].reduce((a, b) => a + b, 0);

  const sumCsv = csvRows.reduce((s, r) => s + r.monto, 0);

  // Categorizar cada fila del CSV
  type Cat = "en_bd" | "vigencia" | "otro";
  const categorias = new Map<Cat, { count: number; sum: number; ejemplos: CsvRowKey[] }>([
    ["en_bd", { count: 0, sum: 0, ejemplos: [] }],
    ["vigencia", { count: 0, sum: 0, ejemplos: [] }],
    ["otro", { count: 0, sum: 0, ejemplos: [] }],
  ]);

  for (const row of csvRows) {
    let cat: Cat;
    if (vigenciaKeys.has(row.key)) cat = "vigencia";
    else if (bdMap.has(row.key)) cat = "en_bd";
    else cat = "otro";

    const c = categorias.get(cat)!;
    c.count++;
    c.sum += row.monto;
    if (c.ejemplos.length < 5) c.ejemplos.push(row);
  }

  console.log("\n--- Resumen por categoría (cada fila del CSV) ---");
  console.log(`   Total filas CSV: ${csvRows.length.toLocaleString()}`);
  console.log(`   Suma CSV:        ${sumCsv.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`);
  console.log("");
  console.log(`   En BD (clave existe en BD):     ${categorias.get("en_bd")!.count.toLocaleString()} filas, suma = ${categorias.get("en_bd")!.sum.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`);
  console.log(`   Vigencia inválida:              ${categorias.get("vigencia")!.count.toLocaleString()} filas, suma = ${categorias.get("vigencia")!.sum.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`);
  console.log(`   Otro (no en BD ni vigencia):    ${categorias.get("otro")!.count.toLocaleString()} filas, suma = ${categorias.get("otro")!.sum.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`);

  const sumaCategorias = categorias.get("en_bd")!.sum + categorias.get("vigencia")!.sum + categorias.get("otro")!.sum;
  const diffSuma = Math.abs(sumCsv - sumaCategorias);
  console.log(`\n   Comprobación: suma categorías = ${sumaCategorias.toLocaleString("es-CO", { minimumFractionDigits: 2 })} (diff con CSV: ${diffSuma.toFixed(2)})`);

  console.log("\n--- Cuadre esperado: BD + vigencia ---");
  console.log(`   Suma BD (todos los procesos): ${sumBd.toLocaleString("es-CO", { minimumFractionDigits: 2 })} (${bdMap.size} procesos)`);
  console.log(`   Suma vigencia (archivo): ${sumVigencia.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`);
  console.log(`   BD + vigencia:          ${(sumBd + sumVigencia).toLocaleString("es-CO", { minimumFractionDigits: 2 })}`);
  console.log(`   Suma CSV:               ${sumCsv.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`);
  const diferencia = sumCsv - (sumBd + sumVigencia);
  console.log(`   Diferencia:             ${diferencia.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`);

  // Cuantificar duplicados en CSV (misma clave que está en BD): solo la 1ª aporta al monto en BD; el resto suman la diferencia
  const clavesEnBd = new Set(bdMap.keys());
  const primeraPorClave = new Map<string, CsvRowKey>();
  const duplicadosConClaveEnBd: CsvRowKey[] = [];
  for (const row of csvRows) {
    if (!clavesEnBd.has(row.key)) continue;
    if (!primeraPorClave.has(row.key)) {
      primeraPorClave.set(row.key, row);
    } else {
      duplicadosConClaveEnBd.push(row);
    }
  }
  const sumDuplicados = duplicadosConClaveEnBd.reduce((s, r) => s + r.monto, 0);
  console.log(`\n   Explicación: ${duplicadosConClaveEnBd.length} filas del CSV son duplicados (misma clave que un proceso en BD).`);
  console.log(`   Esas filas suman ${sumDuplicados.toLocaleString("es-CO", { minimumFractionDigits: 2 })} → por eso Suma CSV = BD + vigencia + esta suma.`);
  if (Math.abs(sumDuplicados - diferencia) < 1) {
    console.log("   ✅ La diferencia coincide con la suma de duplicados (no hay error de datos).");
  }

  // Discrepancias: clave en BD pero monto en CSV (primera ocurrencia) distinto al de BD
  const primeraOcurrenciaCsv = new Map<string, { monto: number; linea: number }>();
  for (const row of csvRows) {
    if (!primeraOcurrenciaCsv.has(row.key)) primeraOcurrenciaCsv.set(row.key, { monto: row.monto, linea: row.linea });
  }
  const discrepancias: { key: string; montoBd: number; montoCsv: number; linea: number }[] = [];
  for (const [key, montoBd] of bdMap) {
    const prim = primeraOcurrenciaCsv.get(key);
    if (!prim) continue;
    const diff = Math.abs(montoBd - prim.monto);
    if (diff > 0.01) {
      discrepancias.push({ key, montoBd, montoCsv: prim.monto, linea: prim.linea });
    }
  }

  if (discrepancias.length > 0) {
    console.log("\n--- ⚠️ Discrepancias monto BD vs CSV (misma clave) ---");
    console.log(`   Encontradas: ${discrepancias.length}. Primeras 10:`);
    for (const d of discrepancias.slice(0, 10)) {
      console.log(`   Línea ${d.linea}: key=${d.key.slice(0, 50)}... | BD=${d.montoBd} CSV=${d.montoCsv}`);
    }
  } else {
    console.log("\n--- ✅ No hay discrepancias de monto entre BD y primera ocurrencia en CSV por clave.");
  }

  if (categorias.get("otro")!.count > 0) {
    console.log("\n--- Ejemplos de filas 'otro' (no en BD ni vigencia inválida) ---");
    for (const e of categorias.get("otro")!.ejemplos) {
      console.log(`   Línea ${e.linea}: comparendo=${e.nroComparendo} doc=${e.identificacion} monto=${e.monto} key=${e.key.slice(0, 60)}...`);
    }
  }

  if (duplicadosConClaveEnBd.length > 0) {
    console.log("\n--- Filas duplicadas en CSV (clave ya en BD; generan la diferencia) ---");
    for (const d of duplicadosConClaveEnBd) {
      console.log(`   Línea ${d.linea}: comparendo=${d.nroComparendo} doc=${d.identificacion} monto=${d.monto.toLocaleString("es-CO")}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌", err);
    process.exit(1);
  });
