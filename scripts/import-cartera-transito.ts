/**
 * Script para cargar el reporte de cartera de tránsito (CSV) al sistema.
 * Crea contribuyentes únicos por documento y procesos asociados al impuesto Tránsito.
 *
 * Uso: pnpm run import:cartera [ruta-opcional.csv]
 * Ruta por defecto: ReporteCarteraActual.csv (o CARTERA_CSV_PATH en .env).
 * Requiere: DATABASE_URL en .env.
 */
import "dotenv/config";
import { appendFileSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import type { TipoDocumento } from "../lib/constants/tipo-documento";
import { db } from "../lib/db";
import {
  contribuyentes,
  impuestos,
  procesos,
  historialProceso,
  ordenesResolucion,
  cobrosCoactivos,
} from "../lib/db/schema";
import { eq } from "drizzle-orm";

const CSV_PATH =
  process.env.CARTERA_CSV_PATH ||
  (process.argv[2] ? resolve(process.cwd(), process.argv[2]) : resolve(process.cwd(), "ReporteCarteraActual.csv"));

const BATCH_SIZE = 1000;
const IMPUESTO_NOMBRE_TRANSITO = "Comparendos de tránsito";

/** Elemento del lote para insert masivo: proceso + metadatos para historial, orden y cobro. */
interface BatchItem {
  contribuyenteId: number;
  vigencia: number;
  periodo: null;
  noComparendo: string | null;
  montoCop: string;
  estadoActual: "pendiente" | "en_cobro_coactivo";
  fechaLimite: string | null;
  fechaAplicacionImpuesto: string | null;
  numeroResolucion: string | null;
  fechaResolucion: string | null;
  codigoInfraccion: string | null;
  tipoResolucion: "sancion" | "resumen_ap" | null;
  tieneCobroCoactivo: boolean;
  noCoactivo: string | null;
  fechaCoactivo: string | null;
  idempotenciaKey: string | null;
  /** Índice de la fila en el CSV (0-based, datos; línea real = csvLineIndex + 1 por cabecera). */
  csvLineIndex: number;
}

/** Normaliza texto del CSV para comparación (quitar tildes, minúsculas). */
function normalizarTipoDocCsv(val: string): string {
  return val
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Mapea valor "Tipo Documento" del CSV al enum de BD. Desconocidos → cedula. */
function mapTipoDocumentoCsv(raw: string): TipoDocumento {
  const n = normalizarTipoDocCsv(raw);
  if (n === "cedula venezolana") return "cedula_venezolana";
  if (n === "tarjeta identidad" || n === "tarjeta de identidad") return "tarjeta_identidad";
  if (n === "cedula" || n === "cedula ciudadania" || n.includes("cedula")) return "cedula";
  return "cedula";
}

/** Parsea fecha d/m/yyyy o d/m/yy a YYYY-MM-DD */
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

/** Suma años a una fecha ISO y devuelve YYYY-MM-DD */
function addYears(isoDate: string, years: number): string {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

const AÑOS_PRESCRIPCION = 5;

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

/** Limpia valor que puede venir con comilla inicial (estilo Excel) */
function limpia(val: string): string {
  return val.replace(/^'/, "").trim();
}

/** Deriva estado del proceso desde "Estado Cartera" del CSV. */
function estadoActualDesdeCartera(estadoCartera: string): "pendiente" | "en_cobro_coactivo" {
  const n = estadoCartera
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
  if (n.includes("cobro") && n.includes("coactivo")) return "en_cobro_coactivo";
  return "pendiente";
}

/** Deriva tipo_resolucion desde "Tipo Resolución" del CSV. */
function tipoResolucionDesdeCsv(tipoResolucion: string): "sancion" | "resumen_ap" | null {
  const n = tipoResolucion
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
  if (n.includes("resumen")) return "resumen_ap";
  if (n.includes("sancion")) return "sancion";
  return null;
}

/** Quita tildes/acentos para normalizar cabeceras (Nro Resolución → Nro Resolucion) */
function normalizarHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/** Parsea una línea del CSV (separador ;, fila puede estar entre comillas simples) */
function parseLine(line: string): string[] {
  const raw = line.trim().replace(/^'|';?\s*$/g, "");
  return raw.split(";").map((cell) => limpia(cell));
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
      const i = idx[key];
      return i >= 0 && cells[i] !== undefined ? cells[i]! : "";
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

async function getOrCreateImpuestoTransito(): Promise<string> {
  const [existente] = await db
    .select({ id: impuestos.id })
    .from(impuestos)
    .where(eq(impuestos.nombre, IMPUESTO_NOMBRE_TRANSITO));
  if (existente) return existente.id;
  const [inserted] = await db
    .insert(impuestos)
    .values({
      nombre: IMPUESTO_NOMBRE_TRANSITO,
      naturaleza: "no_tributario",
      descripcion: "Comparendos y sanciones de tránsito",
      activo: true,
    })
    .returning({ id: impuestos.id });
  if (!inserted) throw new Error("No se pudo crear el impuesto Tránsito");
  return inserted.id;
}

/** Carga las claves de idempotencia de procesos ya importados para el impuesto (evitar duplicados al re-ejecutar). */
async function loadExistingProcessKeys(impuestoId: string): Promise<Set<string>> {
  const rows = await db
    .select({
      contribuyenteId: procesos.contribuyenteId,
      montoCop: procesos.montoCop,
      numeroResolucion: ordenesResolucion.numeroResolucion,
    })
    .from(procesos)
    .leftJoin(ordenesResolucion, eq(procesos.id, ordenesResolucion.procesoId))
    .where(eq(procesos.impuestoId, impuestoId));
  const set = new Set<string>();
  for (const r of rows) {
    const montoStr = String(r.montoCop ?? "0");
    const numeroResolucion = r.numeroResolucion ?? "";
    set.add(`${impuestoId}-${r.contribuyenteId}-${numeroResolucion}-${montoStr}`);
  }
  return set;
}

/** Clave única del contribuyente para deduplicar */
function contribuyenteKey(tipoDoc: TipoDocumento, nit: string): string {
  return `${tipoDoc}:${nit}`;
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Spinner que actualiza una línea con progreso y tiempo transcurrido. */
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
    const line = ` ${frame} Procesando ${state.current.toLocaleString()} / ${total.toLocaleString()} (${pct}%) — ${elapsed}`;
    process.stdout.write(`\r${line}`);
  }, 80);
  return {
    update: (current: number) => {
      state.current = current;
    },
    stop: () => {
      state.done = true;
      clearInterval(interval);
      process.stdout.write("\r" + " ".repeat(100) + "\r");
    },
  };
}

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

/**
 * Inserta un lote de procesos (y sus historial, órdenes, cobros) en una transacción.
 * Si falla, escribe las filas en el archivo de errores y no actualiza numeroResolucionUsados.
 */
async function flushBatch(
  batch: BatchItem[],
  impuestoId: string,
  numeroResolucionUsados: Set<string>,
  csvLines: string[],
  errorFilePathRef: { current: string | null },
  stats: { procesosCreados: number }
): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(procesos)
        .values(
          batch.map((b) => ({
            impuestoId,
            contribuyenteId: b.contribuyenteId,
            vigencia: b.vigencia,
            periodo: b.periodo,
            noComparendo: b.noComparendo,
            montoCop: b.montoCop,
            estadoActual: b.estadoActual,
            asignadoAId: null,
            fechaLimite: b.fechaLimite,
            fechaAplicacionImpuesto: b.fechaAplicacionImpuesto,
          }))
        )
        .returning({ id: procesos.id });
      const procesoIds = inserted.map((r) => r.id);
      await tx.insert(historialProceso).values(
        procesoIds.map((id, i) => ({
          procesoId: id,
          tipoEvento: "cambio_estado" as const,
          estadoAnterior: null,
          estadoNuevo: batch[i]!.estadoActual,
          comentario: "Proceso creado desde importación cartera tránsito",
        }))
      );
      const ordenesPayload = batch
        .map((b, i) =>
          b.numeroResolucion
            ? {
                procesoId: procesoIds[i]!,
                numeroResolucion: b.numeroResolucion,
                fechaResolucion: b.fechaResolucion,
                codigoInfraccion: b.codigoInfraccion,
                tipoResolucion: b.tipoResolucion,
              }
            : null
        )
        .filter((x): x is NonNullable<typeof x> => x !== null);
      if (ordenesPayload.length > 0) {
        await tx.insert(ordenesResolucion).values(ordenesPayload);
      }
      const cobrosPayload = batch
        .map((b, i) =>
          b.tieneCobroCoactivo && b.fechaCoactivo
            ? {
                procesoId: procesoIds[i]!,
                noCoactivo: b.noCoactivo,
                fechaInicio: b.fechaCoactivo,
              }
            : null
        )
        .filter((x): x is NonNullable<typeof x> => x !== null);
      if (cobrosPayload.length > 0) {
        await tx.insert(cobrosCoactivos).values(cobrosPayload);
      }
    });
    for (const b of batch) {
      if (b.idempotenciaKey) numeroResolucionUsados.add(b.idempotenciaKey);
    }
    stats.procesosCreados += batch.length;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const msg = `Batch insert failed: ${errMsg}`;
    if (!errorFilePathRef.current) {
      errorFilePathRef.current = join(
        process.cwd(),
        `import-cartera-errores-${timestampForFilename()}.csv`
      );
      const header = csvLines[0] ?? "";
      writeFileSync(errorFilePathRef.current, `${header};"error"\n`, "utf-8");
    }
    for (const b of batch) {
      const rawLine = csvLines[b.csvLineIndex + 1] ?? "";
      const escaped = errMsg.replace(/"/g, '""');
      appendFileSync(errorFilePathRef.current!, `${rawLine};"${escaped}"\n`, "utf-8");
    }
    console.warn(`⚠ Lote de ${batch.length} procesos falló:`, errMsg);
  }
}

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
  console.log(`📄 Filas leídas: ${filas.length}`);
  const impuestoId = await getOrCreateImpuestoTransito();
  console.log(`📌 Impuesto Tránsito (id=${impuestoId})`);
  const contribuyentesByKey = new Map<
    string,
    { id: number; tipoDocumento: TipoDocumento; nit: string; nombre: string }
  >();
  const contribuyentesExistentes = await db
    .select({
      id: contribuyentes.id,
      nit: contribuyentes.nit,
      tipoDocumento: contribuyentes.tipoDocumento,
      nombreRazonSocial: contribuyentes.nombreRazonSocial,
    })
    .from(contribuyentes);
  for (const c of contribuyentesExistentes) {
    const key = contribuyenteKey(c.tipoDocumento, c.nit);
    contribuyentesByKey.set(key, {
      id: c.id,
      tipoDocumento: c.tipoDocumento,
      nit: c.nit,
      nombre: c.nombreRazonSocial,
    });
  }
  const numeroResolucionUsados = await loadExistingProcessKeys(impuestoId);
  console.log(`📌 Procesos ya existentes en BD (impuesto Tránsito): ${numeroResolucionUsados.size}`);

  const csvLines = csvContent.split(/\r?\n/).filter((l) => l.trim());
  let creados = 0;
  let procesosOmitidos = 0;
  const stats = { procesosCreados: 0 };
  const errorFilePathRef: { current: string | null } = { current: null };
  const batch: BatchItem[] = [];

  const totalFilas = filas.length;
  const spinner = createProgressSpinner(totalFilas);

  for (let i = 0; i < filas.length; i++) {
    spinner.update(i + 1);
    const fila = filas[i]!;
    const nit = fila.identificacion || "SIN-DOC";
    const key = contribuyenteKey(fila.tipoDocumento, nit);
    let contribId: number;
    const existente = contribuyentesByKey.get(key);
    if (existente) {
      contribId = existente.id;
    } else {
      const [inserted] = await db
        .insert(contribuyentes)
        .values({
          nit,
          tipoDocumento: fila.tipoDocumento,
          nombreRazonSocial: fila.nombreInfractor || "Sin nombre",
          telefono: null,
          email: null,
          direccion: null,
          ciudad: null,
          departamento: null,
        })
        .returning({ id: contribuyentes.id });
      if (!inserted) {
        console.warn(`⚠ No se pudo crear contribuyente: ${nit}`);
        procesosOmitidos++;
        continue;
      }
      contribId = inserted.id;
      contribuyentesByKey.set(key, {
        id: contribId,
        tipoDocumento: fila.tipoDocumento,
        nit,
        nombre: fila.nombreInfractor || "Sin nombre",
      });
      creados++;
    }
    const montoStr = fila.valorDeuda || fila.valorMulta || "0";
    const montoNum = parseFloat(montoStr.replace(/,/g, "."));
    const montoCop = Number.isNaN(montoNum) || montoNum < 0 ? "0" : montoNum.toFixed(2);
    const fechaAplicacion =
      fila.fechaComparendo ?? fila.fechaResolucion ?? null;
    const fechaLimite =
      fechaAplicacion != null
        ? addYears(fechaAplicacion, AÑOS_PRESCRIPCION)
        : null;
    const vigencia = fechaAplicacion
      ? parseInt(fechaAplicacion.slice(0, 4), 10)
      : new Date().getFullYear();
    if (vigencia < 2000 || vigencia > 2100) {
      procesosOmitidos++;
      continue;
    }
    const numeroResolucion =
      fila.nroResolucion?.trim() || fila.nroComparendo?.trim() || null;
    const idempotenciaKey = numeroResolucion
      ? `${impuestoId}-${contribId}-${numeroResolucion}-${montoCop}`
      : null;
    if (idempotenciaKey && numeroResolucionUsados.has(idempotenciaKey)) {
      procesosOmitidos++;
      continue;
    }
    const estadoActual = estadoActualDesdeCartera(fila.estadoCartera);
    const noComparendo = fila.nroComparendo?.trim() ? limpia(fila.nroComparendo) : null;
    const tieneCobroCoactivo = fila.polca === "S" && !!fila.fechaCoactivo;
    batch.push({
      contribuyenteId: contribId,
      vigencia,
      periodo: null,
      noComparendo,
      montoCop,
      estadoActual,
      fechaLimite,
      fechaAplicacionImpuesto: fechaAplicacion,
      numeroResolucion,
      fechaResolucion: fila.fechaResolucion ?? null,
      codigoInfraccion: fila.codigoInfraccion?.trim() || null,
      tipoResolucion: tipoResolucionDesdeCsv(fila.tipoResolucion),
      tieneCobroCoactivo,
      noCoactivo: fila.nroCoactivo?.trim() ? limpia(fila.nroCoactivo) : null,
      fechaCoactivo: fila.fechaCoactivo ?? null,
      idempotenciaKey,
      csvLineIndex: i,
    });
    if (batch.length >= BATCH_SIZE) {
      await flushBatch(
        batch,
        impuestoId,
        numeroResolucionUsados,
        csvLines,
        errorFilePathRef,
        stats
      );
      batch.length = 0;
    }
  }
  if (batch.length > 0) {
    await flushBatch(
      batch,
      impuestoId,
      numeroResolucionUsados,
      csvLines,
      errorFilePathRef,
      stats
    );
  }
  spinner.stop();
  console.log(`✅ Contribuyentes nuevos: ${creados}`);
  console.log(`✅ Procesos creados: ${stats.procesosCreados}`);
  if (procesosOmitidos > 0) {
    console.log(`⏭ Procesos omitidos/duplicados/error: ${procesosOmitidos}`);
  }
  if (errorFilePathRef.current) {
    console.log(`📁 Errores registrados en: ${errorFilePathRef.current}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌", err);
    process.exit(1);
  });
