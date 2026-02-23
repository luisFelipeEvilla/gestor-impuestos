/**
 * Verifica que todas las filas del CSV de cartera estén presentes en la BD.
 * Genera un reporte CSV con las filas faltantes y el motivo de ausencia.
 *
 * Uso: pnpm run verificar:comparendos [ruta-opcional.csv]
 * Ruta por defecto: ReporteCarteraActual.csv (o CARTERA_CSV_PATH en .env).
 * Requiere: DATABASE_URL en .env.
 */
import "dotenv/config";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import type { TipoDocumento } from "../lib/constants/tipo-documento";
import { db } from "../lib/db";
import { contribuyentes, procesos } from "../lib/db/schema";
import { eq } from "drizzle-orm";

const CSV_PATH =
  process.env.CARTERA_CSV_PATH ||
  (process.argv[2]
    ? resolve(process.cwd(), process.argv[2])
    : resolve(process.cwd(), "ReporteCarteraActual.csv"));

const OUTPUT_DIR = "import-cartera-output";

// ---------------------------------------------------------------------------
// Helpers (misma lógica que import-cartera-transito.ts para consistencia)
// ---------------------------------------------------------------------------

function normalizarTipoDocCsv(val: string): string {
  return val
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function mapTipoDocumentoCsv(raw: string): TipoDocumento {
  const n = normalizarTipoDocCsv(raw);
  if (n === "cedula venezolana") return "cedula_venezolana";
  if (n === "tarjeta identidad" || n === "tarjeta de identidad")
    return "tarjeta_identidad";
  if (n === "cedula" || n === "cedula ciudadania" || n.includes("cedula"))
    return "cedula";
  return "cedula";
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

function limpia(val: string): string {
  return val.replace(/^'/, "").trim();
}

function normalizarHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function parseLine(line: string): string[] {
  const raw = line.trim().replace(/^'|';?\s*$/g, "");
  return raw.split(";").map((cell) => limpia(cell));
}

interface FilaCsv {
  nroComparendo: string;
  fechaComparendo: string | null;
  nroResolucion: string;
  fechaResolucion: string | null;
  tipoDocumento: TipoDocumento;
  identificacion: string;
  nombreInfractor: string;
  codigoInfraccion: string;
  valorMulta: string;
  tipoResolucion: string;
  estadoCartera: string;
  valorDeuda: string;
  valorIntereses: string;
  polca: string;
  nroCoactivo: string;
  fechaCoactivo: string | null;
}

function parseCsv(content: string): FilaCsv[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headerRaw = parseLine(lines[0]!);
  const header = headerRaw.map((cell) => normalizarHeader(cell));
  const rows: FilaCsv[] = [];
  const idx = {
    nroComparendo: header.indexOf("Nro Comparendo"),
    fechaComparendo: header.indexOf("Fecha Comparendo"),
    nroResolucion: header.indexOf("Nro Resolucion"),
    fechaResolucion: header.indexOf("Fecha Resolucion"),
    tipoDocumento: header.indexOf("Tipo Documento"),
    identificacion: header.indexOf("Identificacion Infractor"),
    nombreInfractor: header.indexOf("Nombre Infractor"),
    codigoInfraccion: header.indexOf("Codigo Infraccion"),
    valorMulta: header.indexOf("Valor Multa"),
    tipoResolucion: header.indexOf("Tipo Resolucion"),
    estadoCartera: header.indexOf("Estado Cartera"),
    valorDeuda: header.indexOf("Valor Deuda"),
    valorIntereses: header.indexOf("Valor Intereses"),
    polca: header.indexOf("Polca"),
    nroCoactivo: header.indexOf("Nro Coactivo"),
    fechaCoactivo: header.indexOf("Fecha Coactivo"),
  };
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]!);
    const get = (key: keyof typeof idx): string => {
      const ci = idx[key];
      return ci >= 0 && cells[ci] !== undefined ? cells[ci]! : "";
    };
    rows.push({
      nroComparendo: get("nroComparendo"),
      fechaComparendo: parseFechaCsv(get("fechaComparendo")) ?? null,
      nroResolucion: get("nroResolucion"),
      fechaResolucion: parseFechaCsv(get("fechaResolucion")) ?? null,
      tipoDocumento: mapTipoDocumentoCsv(get("tipoDocumento")),
      identificacion: get("identificacion"),
      nombreInfractor: get("nombreInfractor"),
      codigoInfraccion: get("codigoInfraccion"),
      valorMulta: get("valorMulta"),
      tipoResolucion: get("tipoResolucion"),
      estadoCartera: get("estadoCartera"),
      valorDeuda: get("valorDeuda"),
      valorIntereses: get("valorIntereses"),
      polca: get("polca"),
      nroCoactivo: get("nroCoactivo"),
      fechaCoactivo: parseFechaCsv(get("fechaCoactivo")) ?? null,
    });
  }
  return rows;
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

// ---------------------------------------------------------------------------
// BD
// ---------------------------------------------------------------------------

async function loadExistingProcessKeys(): Promise<Set<string>> {
  const rows = await db
    .select({
      noComparendo: procesos.noComparendo,
      fechaAplicacionImpuesto: procesos.fechaAplicacionImpuesto,
      montoCop: procesos.montoCop,
      nit: contribuyentes.nit,
    })
    .from(procesos)
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id));
  const set = new Set<string>();
  for (const r of rows) {
    const montoStr = String(r.montoCop ?? "0");
    const montoNormalized = (parseFloat(montoStr) || 0).toFixed(2);
    set.add(
      buildIdempotenciaKey(
        r.noComparendo,
        r.fechaAplicacionImpuesto,
        montoNormalized,
        r.nit ?? ""
      )
    );
  }
  return set;
}

// ---------------------------------------------------------------------------
// Utilidades de salida
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

function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h > 0)
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function createProgressSpinner(total: number) {
  const start = Date.now();
  const state = { current: 0, done: false };
  let frameIndex = 0;
  const interval = setInterval(() => {
    if (state.done) {
      clearInterval(interval);
      return;
    }
    const elapsed = formatElapsed(Date.now() - start);
    const pct = total > 0 ? Math.round((state.current / total) * 100) : 0;
    const frame = SPINNER_FRAMES[frameIndex % SPINNER_FRAMES.length];
    frameIndex++;
    process.stdout.write(
      `\r ${frame} Verificando ${state.current.toLocaleString()} / ${total.toLocaleString()} (${pct}%) — ${elapsed}`
    );
  }, 80);
  return {
    update: (current: number) => {
      state.current = current;
    },
    stop: () => {
      state.done = true;
      clearInterval(interval);
      process.stdout.write("\r" + " ".repeat(120) + "\r");
    },
  };
}

// ---------------------------------------------------------------------------
// Motivos de ausencia (orden de prioridad en la clasificación)
// ---------------------------------------------------------------------------

type Motivo =
  | "vigencia_invalida"
  | "sin_no_comparendo"
  | "duplicado_en_csv"
  | "no_encontrado_en_bd";

function clasificarMotivo(
  fila: FilaCsv,
  vigencia: number,
  noComparendo: string | null,
  idempotenciaKey: string,
  clavesVistasEnCsv: Set<string>
): Motivo {
  if (vigencia < 2000 || vigencia > 2100) return "vigencia_invalida";

  const nroRaw = fila.nroComparendo.trim().toUpperCase();
  if (!nroRaw || nroRaw === "NO REPORTADO") return "sin_no_comparendo";

  if (clavesVistasEnCsv.has(idempotenciaKey)) return "duplicado_en_csv";

  return "no_encontrado_en_bd";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL no está definida en .env");
    process.exit(1);
  }

  let csvContent: string;
  try {
    csvContent = readFileSync(CSV_PATH, "utf-8");
  } catch {
    console.error(`❌ No se encontró el archivo: ${CSV_PATH}`);
    process.exit(1);
  }

  const filas = parseCsv(csvContent);
  if (filas.length === 0) {
    console.error("❌ El CSV no tiene filas de datos.");
    process.exit(1);
  }
  console.log(`📄 Filas leídas del CSV: ${filas.length.toLocaleString()}`);

  console.log("🔍 Cargando claves de idempotencia de la BD…");
  const clavesEnBd = await loadExistingProcessKeys();
  console.log(
    `📌 Procesos en BD: ${clavesEnBd.size.toLocaleString()}`
  );

  const csvLines = csvContent.split(/\r?\n/).filter((l) => l.trim());
  const outputDir = join(process.cwd(), OUTPUT_DIR);
  mkdirSync(outputDir, { recursive: true });

  const reportPath = join(
    outputDir,
    `verificacion-comparendos-${timestampForFilename()}.csv`
  );
  const headerLine = csvLines[0] ?? "";
  writeFileSync(reportPath, `${headerLine};"motivo"\n`, "utf-8");

  const contadores: Record<Motivo, number> = {
    vigencia_invalida: 0,
    sin_no_comparendo: 0,
    duplicado_en_csv: 0,
    no_encontrado_en_bd: 0,
  };
  let encontradosEnBd = 0;
  let faltantes = 0;
  const clavesVistasEnCsv = new Set<string>();

  const spinner = createProgressSpinner(filas.length);

  for (let i = 0; i < filas.length; i++) {
    spinner.update(i + 1);
    const fila = filas[i]!;
    const nit = fila.identificacion || "SIN-DOC";

    const parseMonto = (raw: string): number => {
      const n = parseFloat((raw || "0").replace(/,/g, "."));
      return Number.isNaN(n) || n < 0 ? 0 : n;
    };
    const multaNum = parseMonto(fila.valorMulta);
    const interesesNum = parseMonto(fila.valorIntereses);
    const deudaNum = parseMonto(fila.valorDeuda);
    const montoTotal =
      deudaNum > 0
        ? deudaNum
        : multaNum + interesesNum > 0
          ? multaNum + interesesNum
          : 0;
    const montoCop = montoTotal.toFixed(2);

    const fechaAplicacion =
      fila.fechaComparendo ?? fila.fechaResolucion ?? null;
    const vigencia = fechaAplicacion
      ? parseInt(fechaAplicacion.slice(0, 4), 10)
      : new Date().getFullYear();

    const noComparendo = fila.nroComparendo?.trim()
      ? limpia(fila.nroComparendo)
      : null;

    const idempotenciaKey = buildIdempotenciaKey(
      noComparendo,
      fechaAplicacion,
      montoCop,
      nit
    );

    if (clavesEnBd.has(idempotenciaKey)) {
      encontradosEnBd++;
      clavesVistasEnCsv.add(idempotenciaKey);
      continue;
    }

    const motivo = clasificarMotivo(
      fila,
      vigencia,
      noComparendo,
      idempotenciaKey,
      clavesVistasEnCsv
    );

    clavesVistasEnCsv.add(idempotenciaKey);

    const rawLine = csvLines[i + 1] ?? "";
    const escaped = motivo.replace(/"/g, '""');
    appendFileSync(reportPath, `${rawLine};"${escaped}"\n`, "utf-8");

    contadores[motivo]++;
    faltantes++;
  }

  spinner.stop();

  console.log("\n════════════════════════════════════════════════");
  console.log("  RESULTADO DE VERIFICACIÓN");
  console.log("════════════════════════════════════════════════");
  console.log(`  Total filas CSV:        ${filas.length.toLocaleString()}`);
  console.log(`  Encontrados en BD:      ${encontradosEnBd.toLocaleString()}`);
  console.log(`  Faltantes:              ${faltantes.toLocaleString()}`);
  if (faltantes > 0) {
    console.log("  ────────────────────────────────────────────");
    console.log(
      `    vigencia_invalida:    ${contadores.vigencia_invalida.toLocaleString()}`
    );
    console.log(
      `    sin_no_comparendo:    ${contadores.sin_no_comparendo.toLocaleString()}`
    );
    console.log(
      `    duplicado_en_csv:     ${contadores.duplicado_en_csv.toLocaleString()}`
    );
    console.log(
      `    no_encontrado_en_bd:  ${contadores.no_encontrado_en_bd.toLocaleString()}`
    );
  }
  console.log("════════════════════════════════════════════════");
  console.log(`📁 Reporte: ${reportPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌", err);
    process.exit(1);
  });
