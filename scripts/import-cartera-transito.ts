/**
 * Script para cargar el reporte de cartera de tránsito (CSV) al sistema.
 * Crea contribuyentes únicos por documento y procesos asociados al impuesto Tránsito.
 *
 * Uso: pnpm run import:cartera
 * Requiere: DATABASE_URL en .env y archivo ReporteCarteraActual-Table 1.csv en la raíz del proyecto.
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
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

const CSV_PATH = resolve(
  process.cwd(),
  "ReporteCarteraActual-Table 1.csv"
);

const IMPUESTO_NOMBRE_TRANSITO = "Comparendos de tránsito";

type TipoDocumentoCsv = "Cedula" | "Tarjeta Identidad";
const TIPO_DOC_MAP: Record<TipoDocumentoCsv, "cedula" | "nit"> = {
  Cedula: "cedula",
  "Tarjeta Identidad": "cedula",
};

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
  tipoDocumento: "cedula" | "nit";
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

/** Parsea una línea del CSV (separador ;, fila puede estar entre comillas simples) */
function parseLine(line: string): string[] {
  const raw = line.trim().replace(/^'|';?\s*$/g, "");
  return raw.split(";").map((cell) => limpia(cell));
}

function parseCsv(content: string): FilaCsv[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseLine(lines[0]!);
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
    const tipoDocRaw = get("tipoDocumento");
    const tipoDocumento =
      TIPO_DOC_MAP[tipoDocRaw as TipoDocumentoCsv] ?? "cedula";
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

async function getOrCreateImpuestoTransito(): Promise<number> {
  const [existente] = await db
    .select({ id: impuestos.id })
    .from(impuestos)
    .where(eq(impuestos.nombre, IMPUESTO_NOMBRE_TRANSITO));
  if (existente) return existente.id;
  const [inserted] = await db
    .insert(impuestos)
    .values({
      nombre: IMPUESTO_NOMBRE_TRANSITO,
      tipo: "municipal",
      descripcion: "Comparendos y sanciones de tránsito",
      activo: true,
    })
    .returning({ id: impuestos.id });
  if (!inserted) throw new Error("No se pudo crear el impuesto Tránsito");
  return inserted.id;
}

/** Clave única del contribuyente para deduplicar */
function contribuyenteKey(tipoDoc: "cedula" | "nit", nit: string): string {
  return `${tipoDoc}:${nit}`;
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
    { id: number; tipoDocumento: "cedula" | "nit"; nit: string; nombre: string }
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
  let creados = 0;
  let procesosCreados = 0;
  let procesosOmitidos = 0;
  const numeroResolucionUsados = new Set<string>();
  for (const fila of filas) {
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
    try {
      const [inserted] = await db
        .insert(procesos)
        .values({
          impuestoId,
          contribuyenteId: contribId,
          vigencia,
          periodo: null,
          montoCop,
          estadoActual: "pendiente",
          asignadoAId: null,
          fechaLimite,
          fechaAplicacionImpuesto: fechaAplicacion,
        })
        .returning({ id: procesos.id });
      if (inserted) {
        await db.insert(historialProceso).values({
          procesoId: inserted.id,
          tipoEvento: "cambio_estado",
          estadoAnterior: null,
          estadoNuevo: "pendiente",
          comentario: "Proceso creado desde importación cartera tránsito",
        });
        if (numeroResolucion) {
          await db.insert(ordenesResolucion).values({
            procesoId: inserted.id,
            numeroResolucion,
            fechaResolucion: fila.fechaResolucion ?? null,
          });
        }
        if (fila.polca === "S" && fila.fechaCoactivo) {
          await db.insert(cobrosCoactivos).values({
            procesoId: inserted.id,
            fechaInicio: fila.fechaCoactivo,
          });
        }
        procesosCreados++;
        if (idempotenciaKey) numeroResolucionUsados.add(idempotenciaKey);
      }
    } catch (err) {
      console.warn(`⚠ Error creando proceso para ${nit} / ${fila.nroComparendo}:`, err);
      procesosOmitidos++;
    }
  }
  console.log(`✅ Contribuyentes nuevos: ${creados}`);
  console.log(`✅ Procesos creados: ${procesosCreados}`);
  if (procesosOmitidos > 0) {
    console.log(`⏭ Procesos omitidos/duplicados/error: ${procesosOmitidos}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌", err);
    process.exit(1);
  });
