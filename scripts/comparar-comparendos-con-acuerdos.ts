/**
 * Compara el CSV de comparendos (cartera) contra el CSV de acuerdos de pago
 * y genera un reporte indicando cuáles comparendos tienen acuerdo de pago.
 *
 * Uso:
 *   pnpm run comparar:acuerdos [ruta-comparendos.csv] [ruta-acuerdos.csv]
 *
 * Rutas por defecto:
 *   - Comparendos: ReporteCarteraActual.csv o importe comparendos/ReporteCarteraActual.csv
 *   - Acuerdos: importe comparendos/acuerdos de pago.csv
 *
 * Salida:
 *   - CSV: import-cartera-output/comparacion-acuerdos-YYYY-MM-DD-HH-mm-ss.csv
 *   - Excel: import-cartera-output/comparacion-acuerdos-YYYY-MM-DD-HH-mm-ss.xlsx
 */

import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import ExcelJS from "exceljs";

const DEFAULT_COMPARENDOS =
  process.env.CARTERA_CSV_PATH ||
  resolve(process.cwd(), "importe comparendos/ReporteCarteraActual.csv");
const DEFAULT_ACUERDOS = resolve(
  process.cwd(),
  "importe comparendos/acuerdos de pago.csv"
);
const OUTPUT_DIR = "import-cartera-output";

// ---------------------------------------------------------------------------
// Normalización de números (comparendo / resolución)
// ---------------------------------------------------------------------------

function soloDigitos(val: string): string {
  return (val ?? "").replace(/\D/g, "").trim();
}

function normalizarClaveComparendo(val: string): string[] {
  const digits = soloDigitos(val);
  if (!digits) return [];
  const keys: string[] = [digits];
  const sinCeros = digits.replace(/^0+/, "") || "0";
  if (sinCeros !== digits) keys.push(sinCeros);
  return keys;
}

// ---------------------------------------------------------------------------
// Parse CSV con separador ;
// ---------------------------------------------------------------------------

function parseLine(line: string): string[] {
  return line
    .trim()
    .replace(/^'|';?\s*$/g, "")
    .split(";")
    .map((c) => c.replace(/^'|'$/g, "").trim());
}

function normalizarHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

// --- Acuerdos de pago CSV ---

interface FilaAcuerdo {
  noComparendo: string;
  nit: string;
  nombre: string;
  noAcuerdo: string;
  valorAcuerdo: string;
}

function parseAcuerdosCsv(content: string): FilaAcuerdo[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseLine(lines[0]!).map(normalizarHeader);
  const idxNoComparendo = header.findIndex(
    (h) => h === "n° comparendo" || h === "n comparendo" || h === "no comparendo"
  );
  const idxNit = header.findIndex(
    (h) => h.includes("nit") || h.includes("cedula") || h.includes("cédula")
  );
  const idxNombre = header.findIndex((h) => h === "nombre");
  const idxNoAcuerdo = header.findIndex(
    (h) => h === "n° acuerdo" || h === "n acuerdo" || h === "no acuerdo"
  );
  const idxValorAcuerdo = header.findIndex(
    (h) => h === "valor acuerdo" || h.includes("valor acuerdo")
  );

  if (idxNoComparendo < 0) {
    console.warn(
      "⚠ No se encontró columna 'N° Comparendo' en acuerdos. Columnas:",
      header.slice(0, 15)
    );
  }

  const rows: FilaAcuerdo[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]!);
    const get = (index: number) =>
      index >= 0 && cells[index] !== undefined ? cells[index]! : "";
    const noComp = get(idxNoComparendo);
    if (!noComp || noComp === "-") continue; // sin número de comparendo
    rows.push({
      noComparendo: noComp,
      nit: get(idxNit),
      nombre: get(idxNombre),
      noAcuerdo: get(idxNoAcuerdo),
      valorAcuerdo: get(idxValorAcuerdo),
    });
  }
  return rows;
}

// --- Comparendos (cartera) CSV ---

interface FilaComparendo {
  raw: string[];
  header: string[];
  nroComparendo: string;
  nroResolucion: string;
  identificacion: string;
  nombreInfractor: string;
  estadoCartera: string;
  valorDeuda: string;
}

function parseComparendosCsv(content: string): { header: string[]; rows: FilaComparendo[] } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { header: [], rows: [] };
  const headerRaw = parseLine(lines[0]!);
  const header = headerRaw.map(normalizarHeader);
  const idxNroComparendo = header.findIndex(
    (h) => h === "nro comparendo" || h.includes("nro comparendo")
  );
  const idxNroResolucion = header.findIndex(
    (h) => h === "nro resolucion" || h.includes("nro resolucion")
  );
  const idxIdentificacion = header.findIndex(
    (h) =>
      h === "identificacion infractor" ||
      h.includes("identificacion") ||
      h.includes("identificación")
  );
  const idxNombre = header.findIndex(
    (h) =>
      h === "nombre infractor" ||
      h.includes("nombre infractor") ||
      h === "nombre"
  );
  const idxEstadoCartera = header.findIndex(
    (h) => h === "estado cartera" || h.includes("estado cartera")
  );
  const idxValorDeuda = header.findIndex(
    (h) => h === "valor deuda" || h.includes("valor deuda")
  );

  const rows: FilaComparendo[] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = parseLine(lines[i]!);
    const get = (index: number) =>
      index >= 0 && raw[index] !== undefined ? raw[index]! : "";
    rows.push({
      raw,
      header,
      nroComparendo: get(idxNroComparendo),
      nroResolucion: get(idxNroResolucion),
      identificacion: get(idxIdentificacion),
      nombreInfractor: get(idxNombre),
      estadoCartera: get(idxEstadoCartera),
      valorDeuda: get(idxValorDeuda),
    });
  }
  return { header: headerRaw, rows };
}

// ---------------------------------------------------------------------------
// Índice de acuerdos por claves normalizadas
// ---------------------------------------------------------------------------

function buildAcuerdosIndex(acuerdos: FilaAcuerdo[]): {
  byKey: Map<string, FilaAcuerdo>;
  keys: Set<string>;
} {
  const byKey = new Map<string, FilaAcuerdo>();
  const keys = new Set<string>();

  for (const a of acuerdos) {
    const variantes = normalizarClaveComparendo(a.noComparendo);
    for (const k of variantes) {
      if (k) {
        keys.add(k);
        byKey.set(k, a); // todas las variantes apuntan al mismo acuerdo
      }
    }
  }
  return { byKey, keys };
}

function buscarAcuerdo(
  fila: FilaComparendo,
  keys: Set<string>,
  byKey: Map<string, FilaAcuerdo>
): FilaAcuerdo | null {
  const candidatos = [
    ...normalizarClaveComparendo(fila.nroResolucion),
    ...normalizarClaveComparendo(fila.nroComparendo),
  ];
  // También usar últimos 7-10 dígitos del Nro Comparendo (formato largo)
  const digitsComp = soloDigitos(fila.nroComparendo);
  if (digitsComp.length > 7) {
    candidatos.push(digitsComp.slice(-10));
    candidatos.push(digitsComp.slice(-8));
    candidatos.push(digitsComp.slice(-7));
  }
  const seen = new Set<string>();
  for (const c of candidatos) {
    if (!c || seen.has(c)) continue;
    seen.add(c);
    const sinCeros = c.replace(/^0+/, "") || "0";
    if (keys.has(c)) return byKey.get(c) ?? null;
    if (keys.has(sinCeros)) return byKey.get(sinCeros) ?? null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Salida
// ---------------------------------------------------------------------------

function timestampForFilename(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("-");
}

function formatDateForReport(date: Date): string {
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Export Excel (explicativo para el equipo)
// ---------------------------------------------------------------------------

const HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true },
  fill: {
    type: "pattern",
    pattern: "solid" as ExcelJS.FillPatterns,
    fgColor: { argb: "FFE0E0E0" },
  },
  alignment: { wrapText: true, vertical: "middle" },
};

async function writeExcelReport(
  outPathXlsx: string,
  headerOut: string[],
  resultados: string[][],
  conAcuerdo: number,
  total: number,
  pathComparendos: string,
  pathAcuerdos: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Gestor Impuestos - Comparación acuerdos de pago";
  workbook.created = new Date();

  const sinAcuerdo = total - conAcuerdo;
  const pctConAcuerdo = total > 0 ? ((conAcuerdo / total) * 100).toFixed(1) : "0";

  // ----- Hoja 1: Resumen -----
  const wsResumen = workbook.addWorksheet("Resumen", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  wsResumen.columns = [{ width: 50 }, { width: 60 }];
  const addTitle = (text: string, row: number) => {
    wsResumen.getCell(row, 1).value = text;
    wsResumen.getCell(row, 1).font = { bold: true, size: 12 };
  };
  let row = 1;
  addTitle("Reporte: Comparendos vs Acuerdos de pago", row++);
  row++;
  wsResumen.getCell(row, 1).value = "Fecha de generación:";
  wsResumen.getCell(row, 1).font = { bold: true };
  wsResumen.getCell(row, 2).value = formatDateForReport(new Date());
  row++;
  wsResumen.getCell(row, 1).value = "Archivo de comparendos (cartera):";
  wsResumen.getCell(row, 1).font = { bold: true };
  wsResumen.getCell(row, 2).value = pathComparendos;
  row++;
  wsResumen.getCell(row, 1).value = "Archivo de acuerdos de pago:";
  wsResumen.getCell(row, 1).font = { bold: true };
  wsResumen.getCell(row, 2).value = pathAcuerdos;
  row += 2;
  addTitle("Totales", row++);
  const tabResumen = [
    ["Total comparendos en cartera", String(total)],
    ["Comparendos con acuerdo de pago", String(conAcuerdo)],
    ["Comparendos sin acuerdo", String(sinAcuerdo)],
    ["% con acuerdo", `${pctConAcuerdo}%`],
  ];
  tabResumen.forEach(([label, value], i) => {
    wsResumen.getCell(row + i, 1).value = label;
    wsResumen.getCell(row + i, 2).value = value;
  });
  row += tabResumen.length + 2;
  addTitle("Descripción de las hojas", row++);
  wsResumen.getCell(row, 1).value =
    "• Resumen: esta hoja. Contiene los totales y la fecha de generación.";
  row++;
  wsResumen.getCell(row, 1).value =
    "• Con acuerdo: solo los comparendos que tienen un acuerdo de pago registrado en el archivo de acuerdos.";
  row++;
  wsResumen.getCell(row, 1).value =
    "• Todos: listado completo de comparendos con la columna 'Tiene acuerdo' (Sí/No) y datos del acuerdo cuando aplica.";
  row++;

  // ----- Hoja 2: Con acuerdo -----
  const wsConAcuerdo = workbook.addWorksheet("Con acuerdo", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const idxTieneAcuerdo = headerOut.indexOf("Tiene acuerdo");
  const conAcuerdoRows = resultados.filter((r) => r[idxTieneAcuerdo] === "Sí");
  addDataSheet(wsConAcuerdo, headerOut, conAcuerdoRows);

  // ----- Hoja 3: Todos -----
  const wsTodos = workbook.addWorksheet("Todos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  addDataSheet(wsTodos, headerOut, resultados);

  await workbook.xlsx.writeFile(outPathXlsx);
}

function addDataSheet(
  sheet: ExcelJS.Worksheet,
  headers: string[],
  rows: string[][]
): void {
  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell, colNumber) => {
    cell.style = HEADER_STYLE;
  });
  sheet.getRow(1).height = 22;
  rows.forEach((r) => sheet.addRow(r));
  // Ancho aproximado por columna (mín 10, máx 40)
  const widths = headers.map((h, i) => {
    const maxLen = Math.max(
      (h ?? "").length,
      ...rows.map((r) => String(r[i] ?? "").length)
    );
    return Math.min(42, Math.max(10, maxLen + 1));
  });
  sheet.columns = widths.map((w) => ({ width: w }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const pathComparendos =
    process.argv[2] ?? DEFAULT_COMPARENDOS;
  const pathAcuerdos = process.argv[3] ?? DEFAULT_ACUERDOS;

  const pathComparendosResolved = resolve(process.cwd(), pathComparendos);
  const pathAcuerdosResolved = resolve(process.cwd(), pathAcuerdos);

  console.log("📂 Comparendos (cartera):", pathComparendosResolved);
  console.log("📂 Acuerdos de pago:     ", pathAcuerdosResolved);

  let contentAcuerdos: string;
  let contentComparendos: string;
  try {
    contentAcuerdos = readFileSync(pathAcuerdosResolved, "utf-8");
  } catch (e) {
    console.error("❌ No se pudo leer el archivo de acuerdos:", (e as Error).message);
    process.exit(1);
  }
  try {
    contentComparendos = readFileSync(pathComparendosResolved, "utf-8");
  } catch (e) {
    console.error("❌ No se pudo leer el archivo de comparendos:", (e as Error).message);
    process.exit(1);
  }

  const acuerdos = parseAcuerdosCsv(contentAcuerdos);
  const { header: headerComparendos, rows: rowsComparendos } =
    parseComparendosCsv(contentComparendos);

  console.log("   Acuerdos cargados:   ", acuerdos.length);
  console.log("   Comparendos cargados:", rowsComparendos.length);

  const { byKey, keys } = buildAcuerdosIndex(acuerdos);
  console.log("   Claves de acuerdos (únicas):", keys.size);

  let conAcuerdo = 0;
  const resultados: string[][] = [];
  const headerOut = [
    ...headerComparendos,
    "Tiene acuerdo",
    "N° acuerdo",
    "Valor acuerdo",
  ];

  for (const row of rowsComparendos) {
    const acuerdo = buscarAcuerdo(row, keys, byKey);
    const tieneAcuerdo = !!acuerdo;
    if (tieneAcuerdo) conAcuerdo++;
    resultados.push([
      ...row.raw,
      tieneAcuerdo ? "Sí" : "No",
      acuerdo?.noAcuerdo ?? "",
      acuerdo?.valorAcuerdo ?? "",
    ]);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const baseName = `comparacion-acuerdos-${timestampForFilename()}`;
  const outPath = resolve(process.cwd(), OUTPUT_DIR, `${baseName}.csv`);
  const outPathXlsx = resolve(process.cwd(), OUTPUT_DIR, `${baseName}.xlsx`);

  const csvOut = [headerOut.join(";"), ...resultados.map((r) => r.join(";"))].join("\n");
  writeFileSync(outPath, csvOut, "utf-8");
  console.log("   Generando Excel...");
  await writeExcelReport(
    outPathXlsx,
    headerOut,
    resultados,
    conAcuerdo,
    rowsComparendos.length,
    pathComparendosResolved,
    pathAcuerdosResolved
  );

  console.log("\n✅ Resultado:");
  console.log("   Con acuerdo de pago:", conAcuerdo);
  console.log("   Sin acuerdo:        ", rowsComparendos.length - conAcuerdo);
  console.log("   Total:              ", rowsComparendos.length);
  console.log("   CSV:                ", outPath);
  console.log("   Excel:              ", outPathXlsx);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
