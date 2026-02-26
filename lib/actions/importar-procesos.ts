"use server";

import { requireAdminSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import {
  contribuyentes,
  procesos,
  historialProceso,
  ordenesResolucion,
  cobrosCoactivos,
  importacionesProcesos,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { TipoDocumento } from "@/lib/constants/tipo-documento";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface BatchItem {
  contribuyenteId: number;
  vigencia: number;
  periodo: null;
  noComparendo: string | null;
  montoCop: string;
  montoMultaCop: string | null;
  montoInteresesCop: string | null;
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
}

export interface FilaPreview {
  nroComparendo: string;
  nombreInfractor: string;
  documento: string;
  vigencia: number | null;
  montoCop: string;
  estadoCartera: string;
  nroCoactivo: string;
}

export type PreviewResult =
  | { ok: true; filas: FilaPreview[]; totalFilas: number }
  | { ok: false; error: string };

export type ImportResult =
  | {
      ok: true;
      importacionId: number;
      nombreArchivo: string;
      totalRegistros: number;
      exitosos: number;
      fallidos: number;
      omitidos: number;
      errores: string[];
    }
  | { ok: false; error: string };

// ─── Parsing utilities ────────────────────────────────────────────────────────

function limpia(val: string): string {
  return val.replace(/^'/, "").trim();
}

function normalizarTexto(val: string): string {
  return val
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function normalizarHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function mapTipoDocumentoCsv(raw: string): TipoDocumento {
  const n = normalizarTexto(raw);
  if (n === "cedula venezolana") return "cedula_venezolana";
  if (n === "tarjeta identidad" || n === "tarjeta de identidad") return "tarjeta_identidad";
  if (n.includes("cedula")) return "cedula";
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
    Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day) ||
    month < 1 || month > 12 || day < 1 || day > 31
  ) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(iso + "T12:00:00Z");
  return Number.isNaN(date.getTime()) ? null : iso;
}

function addYears(isoDate: string, years: number): string {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function estadoActualDesdeCartera(estadoCartera: string): "pendiente" | "en_cobro_coactivo" {
  const n = normalizarTexto(estadoCartera);
  if (n.includes("cobro") && n.includes("coactivo")) return "en_cobro_coactivo";
  return "pendiente";
}

function tipoResolucionDesdeCsv(tipoResolucion: string): "sancion" | "resumen_ap" | null {
  const n = normalizarTexto(tipoResolucion);
  if (n.includes("resumen")) return "resumen_ap";
  if (n.includes("sancion")) return "sancion";
  return null;
}

function parseLine(line: string): string[] {
  const raw = line.trim().replace(/^'|';?\s*$/g, "");
  return raw.split(";").map((cell) => limpia(cell));
}

function parseCsv(content: string): FilaCsv[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headerRaw = parseLine(lines[0]!);
  const header = headerRaw.map((cell) => normalizarHeader(cell));
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
  const rows: FilaCsv[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]!);
    const get = (key: keyof typeof idx): string => {
      const ci = idx[key];
      return ci >= 0 && cells[ci] !== undefined ? cells[ci]! : "";
    };
    rows.push({
      nroComparendo: get("nroComparendo"),
      fechaComparendo: parseFechaCsv(get("fechaComparendo")),
      nroResolucion: get("nroResolucion"),
      fechaResolucion: parseFechaCsv(get("fechaResolucion")),
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
      fechaCoactivo: parseFechaCsv(get("fechaCoactivo")),
    });
  }
  return rows;
}

async function parseExcel(buffer: Buffer): Promise<FilaCsv[]> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.default.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  function getCellStr(cell: { value: unknown }): string {
    const val = cell.value;
    if (val === null || val === undefined) return "";
    if (val instanceof Date) {
      return `${val.getDate()}/${val.getMonth() + 1}/${val.getFullYear()}`;
    }
    if (typeof val === "object") {
      if ("richText" in val) {
        return (val as { richText: Array<{ text: string }> }).richText
          .map((r) => r.text)
          .join("");
      }
      if ("result" in val) {
        const result = (val as { result: unknown }).result;
        if (result instanceof Date) {
          return `${result.getDate()}/${result.getMonth() + 1}/${result.getFullYear()}`;
        }
        return String(result ?? "");
      }
    }
    return limpia(String(val));
  }

  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = normalizarHeader(getCellStr(cell));
  });

  const idx = {
    nroComparendo: headers.indexOf("Nro Comparendo"),
    fechaComparendo: headers.indexOf("Fecha Comparendo"),
    nroResolucion: headers.indexOf("Nro Resolucion"),
    fechaResolucion: headers.indexOf("Fecha Resolucion"),
    tipoDocumento: headers.indexOf("Tipo Documento"),
    identificacion: headers.indexOf("Identificacion Infractor"),
    nombreInfractor: headers.indexOf("Nombre Infractor"),
    codigoInfraccion: headers.indexOf("Codigo Infraccion"),
    valorMulta: headers.indexOf("Valor Multa"),
    tipoResolucion: headers.indexOf("Tipo Resolucion"),
    estadoCartera: headers.indexOf("Estado Cartera"),
    valorDeuda: headers.indexOf("Valor Deuda"),
    valorIntereses: headers.indexOf("Valor Intereses"),
    polca: headers.indexOf("Polca"),
    nroCoactivo: headers.indexOf("Nro Coactivo"),
    fechaCoactivo: headers.indexOf("Fecha Coactivo"),
  };

  const rows: FilaCsv[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (key: keyof typeof idx): string => {
      const ci = idx[key];
      if (ci < 0) return "";
      return getCellStr(row.getCell(ci + 1));
    };
    rows.push({
      nroComparendo: get("nroComparendo"),
      fechaComparendo: parseFechaCsv(get("fechaComparendo")),
      nroResolucion: get("nroResolucion"),
      fechaResolucion: parseFechaCsv(get("fechaResolucion")),
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
      fechaCoactivo: parseFechaCsv(get("fechaCoactivo")),
    });
  });
  return rows;
}

function buildIdempotenciaKey(
  noComparendo: string | null,
  fechaAplicacion: string | null,
  montoCop: string,
  nit: string
): string {
  return `${(noComparendo ?? "").trim()}|${fechaAplicacion ?? ""}|${montoCop}|${(nit ?? "").trim()}`;
}

function contribuyenteKey(tipoDoc: TipoDocumento, nit: string): string {
  return `${tipoDoc}:${nit}`;
}

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
    const montoNormalized = (parseFloat(String(r.montoCop ?? "0")) || 0).toFixed(2);
    set.add(buildIdempotenciaKey(r.noComparendo, r.fechaAplicacionImpuesto, montoNormalized, r.nit ?? ""));
  }
  return set;
}

function parseMonto(raw: string): number {
  const n = parseFloat((raw || "0").replace(/,/g, "."));
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

function filaToPreview(f: FilaCsv): FilaPreview {
  const fechaAplicacion = f.fechaComparendo ?? f.fechaResolucion ?? null;
  const vigencia = fechaAplicacion ? parseInt(fechaAplicacion.slice(0, 4), 10) : null;
  const multaNum = parseMonto(f.valorMulta);
  const interesesNum = parseMonto(f.valorIntereses);
  const deudaNum = parseMonto(f.valorDeuda);
  const montoTotal = deudaNum > 0 ? deudaNum : multaNum + interesesNum;
  return {
    nroComparendo: f.nroComparendo || "-",
    nombreInfractor: f.nombreInfractor || "-",
    documento: f.identificacion || "-",
    vigencia,
    montoCop: new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(montoTotal),
    estadoCartera: f.estadoCartera || "-",
    nroCoactivo: f.nroCoactivo || "-",
  };
}

// ─── Batch flush ───────────────────────────────────────────────────────────────

const BATCH_SIZE = 100;
const AÑOS_PRESCRIPCION = 3;

async function flushBatch(
  batch: BatchItem[],
  importacionId: number,
  importadorUserId: number,
  nombreArchivo: string,
  processedKeys: Set<string>,
  stats: { exitosos: number; fallidos: number; errores: string[] }
): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(procesos)
        .values(
          batch.map((b) => ({
            contribuyenteId: b.contribuyenteId,
            vigencia: b.vigencia,
            periodo: b.periodo,
            noComparendo: b.noComparendo,
            montoCop: b.montoCop,
            montoMultaCop: b.montoMultaCop,
            montoInteresesCop: b.montoInteresesCop,
            estadoActual: b.estadoActual,
            asignadoAId: null,
            fechaLimite: b.fechaLimite,
            fechaAplicacionImpuesto: b.fechaAplicacionImpuesto,
            importado: true,
            fechaImportacion: new Date(),
            importacionId,
          }))
        )
        .returning({ id: procesos.id });

      const procesoIds = inserted.map((r) => r.id);

      await tx.insert(historialProceso).values(
        procesoIds.map((id, i) => ({
          procesoId: id,
          usuarioId: importadorUserId,
          tipoEvento: "cambio_estado" as const,
          estadoAnterior: null,
          estadoNuevo: batch[i]!.estadoActual,
          comentario: `Importado desde archivo: ${nombreArchivo}`,
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
      if (b.idempotenciaKey) processedKeys.add(b.idempotenciaKey);
    }
    stats.exitosos += batch.length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    stats.fallidos += batch.length;
    stats.errores.push(`Lote de ${batch.length} registros falló: ${msg}`);
  }
}

// ─── Server Actions ────────────────────────────────────────────────────────────

export async function previewImportacion(formData: FormData): Promise<PreviewResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "No autorizado" };

  const archivo = formData.get("archivo");
  if (!archivo || typeof archivo === "string") {
    return { ok: false, error: "No se recibió ningún archivo" };
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const nombre = archivo.name.toLowerCase();

  let filasCsv: FilaCsv[];
  try {
    if (nombre.endsWith(".xlsx") || nombre.endsWith(".xls")) {
      filasCsv = await parseExcel(buffer);
    } else {
      filasCsv = parseCsv(buffer.toString("utf-8"));
    }
  } catch (err) {
    return {
      ok: false,
      error: `Error al leer el archivo: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (filasCsv.length === 0) {
    return { ok: false, error: "El archivo no contiene datos o el formato no es compatible." };
  }

  return {
    ok: true,
    filas: filasCsv.slice(0, 50).map(filaToPreview),
    totalFilas: filasCsv.length,
  };
}

export async function ejecutarImportacion(formData: FormData): Promise<ImportResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "No autorizado" };

  const archivo = formData.get("archivo");
  if (!archivo || typeof archivo === "string") {
    return { ok: false, error: "No se recibió ningún archivo" };
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const nombre = archivo.name.toLowerCase();

  let filasCsv: FilaCsv[];
  try {
    if (nombre.endsWith(".xlsx") || nombre.endsWith(".xls")) {
      filasCsv = await parseExcel(buffer);
    } else {
      filasCsv = parseCsv(buffer.toString("utf-8"));
    }
  } catch (err) {
    return {
      ok: false,
      error: `Error al leer el archivo: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (filasCsv.length === 0) {
    return { ok: false, error: "El archivo no contiene datos o el formato no es compatible." };
  }

  // Create the import record before processing
  const [importacionRow] = await db
    .insert(importacionesProcesos)
    .values({
      nombreArchivo: archivo.name,
      usuarioId: session.user.id,
      totalRegistros: filasCsv.length,
      estado: "procesando",
    })
    .returning({ id: importacionesProcesos.id });

  if (!importacionRow) {
    return { ok: false, error: "No se pudo crear el registro de importación" };
  }

  const importacionId = importacionRow.id;
  const stats = { exitosos: 0, fallidos: 0, errores: [] as string[] };
  let omitidos = 0;

  try {
    // Load existing contribuyentes and process keys
    const contribuyentesByKey = new Map<
      string,
      { id: number; tipoDocumento: TipoDocumento; nit: string }
    >();
    const contribuyentesExistentes = await db
      .select({
        id: contribuyentes.id,
        nit: contribuyentes.nit,
        tipoDocumento: contribuyentes.tipoDocumento,
      })
      .from(contribuyentes);
    for (const c of contribuyentesExistentes) {
      contribuyentesByKey.set(contribuyenteKey(c.tipoDocumento, c.nit), {
        id: c.id,
        tipoDocumento: c.tipoDocumento,
        nit: c.nit,
      });
    }

    const processedKeys = await loadExistingProcessKeys();
    const clavesVistasEnCsv = new Set<string>();
    const batch: BatchItem[] = [];

    for (const fila of filasCsv) {
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
          omitidos++;
          continue;
        }
        contribId = inserted.id;
        contribuyentesByKey.set(key, { id: contribId, tipoDocumento: fila.tipoDocumento, nit });
      }

      const multaNum = parseMonto(fila.valorMulta);
      const interesesNum = parseMonto(fila.valorIntereses);
      const deudaNum = parseMonto(fila.valorDeuda);
      const montoTotal = deudaNum > 0 ? deudaNum : multaNum + interesesNum > 0 ? multaNum + interesesNum : 0;
      const montoCop = montoTotal.toFixed(2);
      const montoMultaCop = multaNum > 0 ? multaNum.toFixed(2) : null;
      const montoInteresesCop = interesesNum > 0 ? interesesNum.toFixed(2) : null;

      const fechaAplicacion = fila.fechaComparendo ?? fila.fechaResolucion ?? null;
      const fechaLimite = fechaAplicacion ? addYears(fechaAplicacion, AÑOS_PRESCRIPCION) : null;
      const vigencia = fechaAplicacion
        ? parseInt(fechaAplicacion.slice(0, 4), 10)
        : new Date().getFullYear();

      if (vigencia < 2000 || vigencia > 2100) {
        omitidos++;
        continue;
      }

      const noComparendo = fila.nroComparendo?.trim() ? limpia(fila.nroComparendo) : null;
      const idempotenciaKey = buildIdempotenciaKey(noComparendo, fechaAplicacion, montoCop, nit);

      if (processedKeys.has(idempotenciaKey) || clavesVistasEnCsv.has(idempotenciaKey)) {
        omitidos++;
        continue;
      }
      clavesVistasEnCsv.add(idempotenciaKey);

      const numeroResolucion = fila.nroResolucion?.trim() || noComparendo || null;
      const tieneCobroCoactivo = fila.polca === "S" && !!fila.fechaCoactivo;

      batch.push({
        contribuyenteId: contribId,
        vigencia,
        periodo: null,
        noComparendo,
        montoCop,
        montoMultaCop,
        montoInteresesCop,
        estadoActual: estadoActualDesdeCartera(fila.estadoCartera),
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
      });

      if (batch.length >= BATCH_SIZE) {
        await flushBatch(batch, importacionId, session.user.id, archivo.name, processedKeys, stats);
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      await flushBatch(batch, importacionId, session.user.id, archivo.name, processedKeys, stats);
    }

    const estadoFinal =
      stats.fallidos > 0
        ? stats.exitosos > 0
          ? "completado_con_errores"
          : "fallido"
        : "completado";

    await db
      .update(importacionesProcesos)
      .set({
        exitosos: stats.exitosos,
        fallidos: stats.fallidos,
        omitidos,
        estado: estadoFinal,
      })
      .where(eq(importacionesProcesos.id, importacionId));

    return {
      ok: true,
      importacionId,
      nombreArchivo: archivo.name,
      totalRegistros: filasCsv.length,
      exitosos: stats.exitosos,
      fallidos: stats.fallidos,
      omitidos,
      errores: stats.errores,
    };
  } catch (err) {
    await db
      .update(importacionesProcesos)
      .set({ estado: "fallido" })
      .where(eq(importacionesProcesos.id, importacionId));

    return {
      ok: false,
      error: `Error durante la importación: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
