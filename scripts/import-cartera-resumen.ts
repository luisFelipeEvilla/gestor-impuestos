/**
 * Script de resumen previo a la importación de cartera de tránsito.
 * Sin insertar nada, reporta: procesos ya en BD, por importar y con errores.
 *
 * Uso: pnpm exec tsx scripts/import-cartera-resumen.ts [ruta-opcional.csv]
 * Requiere: DATABASE_URL en .env.
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { TipoDocumento } from "../lib/constants/tipo-documento";
import { db } from "../lib/db";
import { contribuyentes, procesos } from "../lib/db/schema";
import { eq } from "drizzle-orm";

const CSV_PATH =
  process.env.CARTERA_CSV_PATH ||
  (process.argv[2] ? resolve(process.cwd(), process.argv[2]) : resolve(process.cwd(), "ReporteCarteraActual.csv"));

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
  if (n === "tarjeta identidad" || n === "tarjeta de identidad") return "tarjeta_identidad";
  if (n === "cedula" || n === "cedula ciudadania" || n.includes("cedula")) return "cedula";
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
  ) {
    return null;
  }
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
      const idxVal = idx[key];
      return idxVal >= 0 && cells[idxVal] !== undefined ? cells[idxVal]! : "";
    };
    const tipoDocumento = mapTipoDocumentoCsv(get("tipoDocumento"));
    rows.push({
      nroComparendo: get("nroComparendo"),
      fechaComparendo: parseFechaCsv(get("fechaComparendo")) ?? null,
      nroResolucion: get("nroResolucion"),
      fechaResolucion: parseFechaCsv(get("fechaResolucion")) ?? null,
      tipoDocumento,
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

function contribuyenteKey(tipoDoc: TipoDocumento, nit: string): string {
  return `${tipoDoc}:${nit}`;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL no está definida en .env");
    process.exit(1);
  }
  let csvContent: string;
  try {
    csvContent = readFileSync(CSV_PATH, "utf-8");
  } catch {
    console.error(`No se encontró el archivo: ${CSV_PATH}`);
    process.exit(1);
  }
  const filas = parseCsv(csvContent);
  if (filas.length === 0) {
    console.error("El CSV no tiene filas de datos.");
    process.exit(1);
  }

  const contribuyentesByKey = new Map<string, { id: number }>();
  const contribuyentesExistentes = await db
    .select({
      id: contribuyentes.id,
      nit: contribuyentes.nit,
      tipoDocumento: contribuyentes.tipoDocumento,
    })
    .from(contribuyentes);
  for (const c of contribuyentesExistentes) {
    contribuyentesByKey.set(contribuyenteKey(c.tipoDocumento, c.nit), { id: c.id });
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

  const procesosExistentes = await db
    .select({
      noComparendo: procesos.noComparendo,
      fechaAplicacionImpuesto: procesos.fechaAplicacionImpuesto,
      montoCop: procesos.montoCop,
      nit: contribuyentes.nit,
    })
    .from(procesos)
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id));

  const clavesYaEnBd = new Set<string>();
  for (const row of procesosExistentes) {
    const key = buildIdempotenciaKey(
      row.noComparendo,
      row.fechaAplicacionImpuesto,
      String(row.montoCop ?? "0"),
      row.nit ?? ""
    );
    clavesYaEnBd.add(key);
  }

  let yaExisten = 0;
  let porImportar = 0;
  let conErrores = 0;
  const vistosEnCsv = new Set<string>();

  for (const fila of filas) {
    const nit = fila.identificacion || "SIN-DOC";
    const key = contribuyenteKey(fila.tipoDocumento, nit);
    contribuyentesByKey.get(key);

    const fechaAplicacion = fila.fechaComparendo ?? fila.fechaResolucion ?? null;
    const vigencia = fechaAplicacion
      ? parseInt(fechaAplicacion.slice(0, 4), 10)
      : new Date().getFullYear();
    if (vigencia < 2000 || vigencia > 2100) {
      conErrores++;
      continue;
    }

    const montoStr = fila.valorDeuda || fila.valorMulta || "0";
    const montoNum = parseFloat(montoStr.replace(/,/g, "."));
    const montoCop = Number.isNaN(montoNum) || montoNum < 0 ? "0" : montoNum.toFixed(2);
    const noComparendo = fila.nroComparendo?.trim() ? limpia(fila.nroComparendo) : null;
    const idempotenciaKey = buildIdempotenciaKey(noComparendo, fechaAplicacion, montoCop, nit);

    if (clavesYaEnBd.has(idempotenciaKey)) {
      yaExisten++;
      continue;
    }
    if (vistosEnCsv.has(idempotenciaKey)) {
      conErrores++;
      continue;
    }
    vistosEnCsv.add(idempotenciaKey);
    porImportar++;
  }

  const total = yaExisten + porImportar + conErrores;
  console.log("--- Resumen de importación de cartera (preview) ---");
  console.log(`Procesos ya existentes en BD: ${yaExisten}`);
  console.log(`Filas que quedarían por importar: ${porImportar}`);
  console.log(`Filas con errores u omitidas (vigencia inválida, duplicados en CSV): ${conErrores}`);
  console.log(`Total filas en CSV: ${filas.length}`);
  if (total !== filas.length) {
    console.log(`(Comprobación: ${total} contabilizadas vs ${filas.length} filas)`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
