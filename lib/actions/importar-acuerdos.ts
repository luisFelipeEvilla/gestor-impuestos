"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import {
  procesos,
  contribuyentes,
  ordenesResolucion,
  acuerdosPago,
  cuotasAcuerdo,
  historialProceso,
  importacionesAcuerdos,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  clavesParaBusqueda,
  buscarProcesoIdPorComparendo,
} from "@/lib/utils/normalizar-comparendo";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilaPreviewAcuerdo {
  noComparendo: string;
  noAcuerdo: string;
  nombre: string;
  estado: "match" | "sin_match" | "duplicado";
  procesoId: number | null;
  contribuyenteNombre: string | null;
  cuotas: number | null;
  fechaAcuerdo: string | null;
  errorValidacion?: string;
}

export type PreviewAcuerdosResult =
  | {
      ok: true;
      filas: FilaPreviewAcuerdo[];
      totalFilas: number;
      resumen: { conMatch: number; sinMatch: number; duplicados: number };
    }
  | { ok: false; error: string };

export type ImportAcuerdosResult =
  | {
      ok: true;
      importacionId: number;
      nombreArchivo: string;
      importados: number;
      omitidos: number;
      fallidos: number;
      errores: string[];
    }
  | { ok: false; error: string };

interface CuotaDetalle {
  numeroCuota: number;
  monto: number | null;
  fechaPago: string | null;
  estado: "pagada" | "pendiente";
}

interface FilaAcuerdoParse {
  noComparendo: string;
  noAcuerdo: string;
  nombre: string;
  fechaAcuerdo: string | null;
  fechaCuotaInicial: string | null;
  numCuotas: number;
  porcentajeCuotaInicial: number;
  diaCobroMes: number;
  fechaInicioPrescripcion: string | null;
  valorCuota: number | null;
  cuotasDetalle: CuotaDetalle[];
  fechaUltimoPago: string | null;
}

// ─── Parse CSV ─────────────────────────────────────────────────────────────────

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

/**
 * Parsea fecha en formato mm/dd/yy (o mm/dd/yyyy) a YYYY-MM-DD.
 */
function parseFechaCsv(value: string): string | null {
  const trimmed = (value ?? "").replace(/^'|'$/g, "").trim();
  if (!trimmed) return null;
  const parts = trimmed.split("/");
  if (parts.length !== 3) return null;
  const [m, d, y] = parts;
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

function parsePorcentaje(raw: string): number {
  const s = (raw ?? "").replace(/%/g, "").replace(/,/g, ".").trim();
  const n = parseFloat(s);
  if (Number.isNaN(n) || n < 0 || n > 100) return 30;
  return n;
}

/**
 * Parsea montos en COP del CSV: "$ 123.667" → 123667, "$ 64.000,00" → 64000.
 * Los puntos son separadores de miles y la coma es el separador decimal.
 */
function parseMontoCop(raw: string): number | null {
  if (!raw) return null;
  const cleaned = (raw ?? "")
    .replace(/\$/g, "")
    .replace(/\t/g, "")
    .replace(/ /g, "")
    .replace(/\./g, "")   // eliminar separadores de miles
    .replace(/,/g, ".");  // separador decimal
  const n = parseFloat(cleaned);
  return Number.isNaN(n) || n < 0 ? null : n;
}

function parseDiaFromFecha(fechaStr: string | null): number {
  const iso = parseFechaCsv(fechaStr ?? "");
  if (!iso) return 15;
  const day = parseInt(iso.slice(8, 10), 10);
  if (day >= 1 && day <= 31) return day;
  return 15;
}

function parseAcuerdosCsv(content: string): FilaAcuerdoParse[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseLine(lines[0]!).map(normalizarHeader);
  const getIdx = (names: string[]) => {
    for (const n of names) {
      const i = header.findIndex((h) => h === n || h.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  };
  const idxNoComparendo = getIdx(["n° comparendo", "n comparendo", "no comparendo"]);
  const idxNoAcuerdo = getIdx(["n° acuerdo", "n acuerdo", "no acuerdo"]);
  const idxNombre = header.findIndex((h) => h === "nombre");
  const idxFechaAcuerdo = getIdx(["fecha acuerdo"]);
  const idxFechaCuotaInicial = getIdx(["fecha cuota inicial"]);
  const idxNumCuotas = getIdx(["n° cuotas", "n cuotas", "no cuotas", "nº cuotas"]);
  const idxPorcentaje = getIdx(["% cuota inicial", "cuota inicial"]);
  const idxFechaCuota1 = header.findIndex((h) => h === "fecha cuota 1");
  const idxFechaInicioPrescripcion = getIdx(["fecha inicio preescripcion", "fecha inicio preescripción"]);
  const idxValorCuota = getIdx(["valor de la cuota"]);
  const idxFechaUltimoPago = getIdx(["fecha de ultimo pago", "fecha ultimo pago"]);

  // Índices para cada cuota individual (hasta 12): "Cuota N" y "Fecha cuota N"
  const MAX_CUOTAS = 12;
  const cuotaCols: Array<{ montoIdx: number; fechaIdx: number }> = [];
  for (let n = 1; n <= MAX_CUOTAS; n++) {
    cuotaCols.push({
      montoIdx: header.findIndex((h) => h === `cuota ${n}`),
      fechaIdx: header.findIndex((h) => h === `fecha cuota ${n}`),
    });
  }

  if (idxNoComparendo < 0) return [];

  const rows: FilaAcuerdoParse[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]!);
    const get = (index: number) =>
      index >= 0 && cells[index] !== undefined ? cells[index]! : "";
    const noCompRaw = get(idxNoComparendo);
    if (!noCompRaw || noCompRaw === "-") continue;

    // Un acuerdo puede estar asociado a varios comparendos separados por '-'
    const comparendos = noCompRaw
      .split("-")
      .map((s) => s.trim())
      .filter(Boolean);
    if (comparendos.length === 0) continue;

    const numCuotasRaw = get(idxNumCuotas).replace(/\D/g, "") || "1";
    const numCuotas = Math.max(1, parseInt(numCuotasRaw, 10) || 1);
    const porcentaje = parsePorcentaje(get(idxPorcentaje));
    const valorCuota = parseMontoCop(get(idxValorCuota));
    const fechaUltimoPago = parseFechaCsv(get(idxFechaUltimoPago));

    // Detalle de cuotas (monto + fecha de pago real, mismos para todos los comparendos del acuerdo)
    const cuotasDetalle: CuotaDetalle[] = [];
    for (let n = 0; n < Math.min(numCuotas, MAX_CUOTAS); n++) {
      const col = cuotaCols[n]!;
      const monto = col.montoIdx >= 0 ? parseMontoCop(get(col.montoIdx)) : null;
      const fechaPago = col.fechaIdx >= 0 ? parseFechaCsv(get(col.fechaIdx)) : null;
      const estado: "pagada" | "pendiente" =
        monto != null && monto > 0 && fechaPago != null ? "pagada" : "pendiente";
      cuotasDetalle.push({ numeroCuota: n + 1, monto, fechaPago, estado });
    }

    // Fechas que pueden venir múltiples (separadas por '-') cuando hay varios comparendos en una fila
    const splitByGuion = (raw: string) =>
      raw.split("-").map((s) => s.trim()).filter(Boolean);
    const fechasAcuerdo = splitByGuion(get(idxFechaAcuerdo)).map(parseFechaCsv);
    const fechasCuotaInicial = splitByGuion(get(idxFechaCuotaInicial)).map(parseFechaCsv);
    const fechasCuota1 = splitByGuion(
      get(idxFechaCuota1 >= 0 ? idxFechaCuota1 : idxFechaCuotaInicial)
    ).map(parseFechaCsv);
    const fechasInicioPrescripcion = splitByGuion(
      get(idxFechaInicioPrescripcion)
    ).map(parseFechaCsv);

    for (let ci = 0; ci < comparendos.length; ci++) {
      const fechaAcuerdo = fechasAcuerdo[ci] ?? fechasAcuerdo[0] ?? null;
      const fechaCuotaInicial = fechasCuotaInicial[ci] ?? fechasCuotaInicial[0] ?? null;
      const fechaInicioPrescripcion =
        fechasInicioPrescripcion[ci] ?? fechasInicioPrescripcion[0] ?? null;
      const fechaCuota1Iso = fechasCuota1[ci] ?? fechasCuota1[0];
      const dayFromIso =
        fechaCuota1Iso && fechaCuota1Iso.length >= 10
          ? parseInt(fechaCuota1Iso.slice(8, 10), 10)
          : 0;
      const diaCobroMes = dayFromIso >= 1 && dayFromIso <= 31 ? dayFromIso : 15;

      rows.push({
        noComparendo: comparendos[ci]!,
        noAcuerdo: get(idxNoAcuerdo),
        nombre: get(idxNombre),
        numCuotas,
        porcentajeCuotaInicial: porcentaje,
        valorCuota,
        cuotasDetalle,
        fechaUltimoPago,
        fechaAcuerdo,
        fechaCuotaInicial,
        fechaInicioPrescripcion,
        diaCobroMes,
      });
    }
  }
  return rows;
}

// ─── Índice procesos (clave normalizada -> procesoId) ───────────────────────────

async function buildIndiceProcesos(): Promise<Map<string, number>> {
  const rows = await db
    .select({
      id: procesos.id,
      noComparendo: procesos.noComparendo,
      numeroResolucion: ordenesResolucion.numeroResolucion,
    })
    .from(procesos)
    .leftJoin(ordenesResolucion, eq(procesos.id, ordenesResolucion.procesoId));

  const indice = new Map<string, number>();
  for (const r of rows) {
    const keys = [
      ...clavesParaBusqueda(r.noComparendo ?? ""),
      ...clavesParaBusqueda(r.numeroResolucion ?? ""),
    ];
    for (const k of keys) {
      if (k) indice.set(k, r.id);
    }
  }
  return indice;
}

// ─── Acuerdos existentes por proceso (numero_acuerdo normalizado) ──────────────

async function loadAcuerdosExistentesPorProceso(): Promise<
  Map<number, Set<string>>
> {
  const rows = await db
    .select({ procesoId: acuerdosPago.procesoId, numeroAcuerdo: acuerdosPago.numeroAcuerdo })
    .from(acuerdosPago);
  const map = new Map<number, Set<string>>();
  for (const r of rows) {
    const num = (r.numeroAcuerdo ?? "").trim().toLowerCase();
    if (!map.has(r.procesoId)) map.set(r.procesoId, new Set());
    map.get(r.procesoId)!.add(num);
  }
  return map;
}

// ─── Preview ───────────────────────────────────────────────────────────────────

export async function previewImportacionAcuerdos(
  formData: FormData
): Promise<PreviewAcuerdosResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "No autorizado" };

  const file = formData.get("archivo");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Seleccione un archivo CSV." };
  }
  const content = await file.text();
  const filas = parseAcuerdosCsv(content);
  if (filas.length === 0) {
    return {
      ok: false,
      error:
        "No se encontraron filas válidas. Verifique que el CSV tenga columna 'N° Comparendo' y separador punto y coma.",
    };
  }

  const [indice, acuerdosExistentes, procesosConContribuyente] = await Promise.all([
    buildIndiceProcesos(),
    loadAcuerdosExistentesPorProceso(),
    db
      .select({
        id: procesos.id,
        nombreRazonSocial: contribuyentes.nombreRazonSocial,
      })
      .from(procesos)
      .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id)),
  ]);
  const procesoById = new Map(procesosConContribuyente.map((p) => [p.id, p]));

  const preview: FilaPreviewAcuerdo[] = [];
  let conMatch = 0;
  let sinMatch = 0;
  let duplicados = 0;

  for (const f of filas) {
    const procesoId = buscarProcesoIdPorComparendo(f.noComparendo, indice);
    const existentes = procesoId ? acuerdosExistentes.get(procesoId) : undefined;
    const numeroNorm = f.noAcuerdo.trim().toLowerCase();
    const esDuplicado =
      procesoId != null &&
      existentes != null &&
      existentes.has(numeroNorm);

    if (procesoId == null) sinMatch++;
    else if (esDuplicado) duplicados++;
    else conMatch++;

    const proceso = procesoId != null ? procesoById.get(procesoId) : null;
    let estado: FilaPreviewAcuerdo["estado"] = "match";
    if (procesoId == null) estado = "sin_match";
    else if (esDuplicado) estado = "duplicado";

    preview.push({
      noComparendo: f.noComparendo,
      noAcuerdo: f.noAcuerdo,
      nombre: f.nombre,
      estado,
      procesoId: procesoId ?? null,
      contribuyenteNombre: proceso?.nombreRazonSocial ?? null,
      cuotas: f.numCuotas,
      fechaAcuerdo: f.fechaAcuerdo,
    });
  }

  return {
    ok: true,
    filas: preview,
    totalFilas: filas.length,
    resumen: { conMatch, sinMatch, duplicados },
  };
}

// ─── Helper: sumar meses a una fecha ISO ──────────────────────────────────────

function addMonthsToIso(iso: string, months: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

// ─── Ejecutar importación ─────────────────────────────────────────────────────

export async function ejecutarImportacionAcuerdos(
  formData: FormData
): Promise<ImportAcuerdosResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "No autorizado" };

  const file = formData.get("archivo");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Seleccione un archivo CSV." };
  }
  const content = await file.text();
  const filas = parseAcuerdosCsv(content);
  if (filas.length === 0) {
    return { ok: false, error: "No hay filas válidas para importar." };
  }

  const [indice, acuerdosExistentes] = await Promise.all([
    buildIndiceProcesos(),
    loadAcuerdosExistentesPorProceso(),
  ]);

  const [importacionRow] = await db
    .insert(importacionesAcuerdos)
    .values({
      nombreArchivo: file.name,
      usuarioId: session.user.id,
      totalRegistros: filas.length,
    })
    .returning({ id: importacionesAcuerdos.id });

  if (!importacionRow) {
    return { ok: false, error: "No se pudo crear el registro de importación." };
  }
  const importacionId = importacionRow.id;

  let importados = 0;
  let omitidos = 0;
  let fallidos = 0;
  const errores: string[] = [];
  const now = new Date();

  for (const f of filas) {
    const procesoId = buscarProcesoIdPorComparendo(f.noComparendo, indice);
    if (procesoId == null) {
      omitidos++;
      continue;
    }
    const existentes = acuerdosExistentes.get(procesoId);
    const numeroNorm = f.noAcuerdo.trim().toLowerCase();
    if (existentes?.has(numeroNorm)) {
      omitidos++;
      continue;
    }

    const numCuotas = f.numCuotas >= 1 ? f.numCuotas : 1;
    const porcentaje =
      f.porcentajeCuotaInicial >= 0 && f.porcentajeCuotaInicial <= 100
        ? f.porcentajeCuotaInicial
        : 30;
    const dia =
      f.diaCobroMes >= 1 && f.diaCobroMes <= 31 ? f.diaCobroMes : 15;
    const numeroAcuerdo = f.noAcuerdo.trim() || `Acuerdo ${f.noComparendo}`;

    try {
      const [acuerdoInserted] = await db
        .insert(acuerdosPago)
        .values({
          procesoId,
          numeroAcuerdo,
          fechaAcuerdo: f.fechaAcuerdo,
          fechaInicio: f.fechaCuotaInicial,
          cuotas: numCuotas,
          porcentajeCuotaInicial: porcentaje.toFixed(2),
          diaCobroMes: dia,
          fechaImportacion: now,
          importacionId,
        })
        .returning({ id: acuerdosPago.id });

      if (!acuerdoInserted) {
        fallidos++;
        errores.push(`Fila ${f.noComparendo}: no se obtuvo id del acuerdo.`);
        continue;
      }

      const acuerdoId = acuerdoInserted.id;

      // Calcular fecha de prescripción:
      // - Si hay cuotas pendientes: última cuota pagada + 37 meses
      // - Si todas pagadas (o ninguna cuota pagada): usar fechaInicioPrescripcion del CSV
      const cuotasPagadas = f.cuotasDetalle.filter((c) => c.estado === "pagada");
      const hayPendientes = f.cuotasDetalle.some((c) => c.estado === "pendiente");
      const ultimaCuotaPagada = cuotasPagadas[cuotasPagadas.length - 1] ?? null;

      let fechaLimiteNueva: string | null = null;
      if (hayPendientes) {
        // Sigue debiendo: base = última cuota pagada, o si no hay pagos, fecha del acuerdo
        const fechaBase37 =
          ultimaCuotaPagada?.fechaPago ?? f.fechaAcuerdo ?? f.fechaCuotaInicial;
        if (fechaBase37) {
          fechaLimiteNueva = addMonthsToIso(fechaBase37, 37);
        }
      } else if (f.fechaInicioPrescripcion) {
        // Todas pagadas: usar fecha de prescripción del CSV
        fechaLimiteNueva = f.fechaInicioPrescripcion;
      }

      await db
        .update(procesos)
        .set({
          estadoActual: "acuerdo_pago",
          ...(fechaLimiteNueva ? { fechaLimite: fechaLimiteNueva } : {}),
          actualizadoEn: now,
        })
        .where(eq(procesos.id, procesoId));

      await db.insert(historialProceso).values({
        procesoId,
        usuarioId: session.user.id,
        tipoEvento: "cambio_estado",
        estadoAnterior: null,
        estadoNuevo: "acuerdo_pago",
        comentario: `Acuerdo de pago importado desde CSV: ${numeroAcuerdo}`,
      });

      // Insertar cuotas con monto y estado reales del CSV
      const fechaBase = f.fechaCuotaInicial ?? f.fechaAcuerdo ?? null;
      const cuotasToInsert = Array.from({ length: numCuotas }, (_, i) => {
        const detalle = f.cuotasDetalle[i];
        const fechaVencimiento =
          detalle?.fechaPago ?? (fechaBase ? addMonthsToIso(fechaBase, i) : null);
        return {
          acuerdoPagoId: acuerdoId,
          numeroCuota: i + 1,
          // El monto esperado es el "Valor de la cuota" (estándar), o el que vino en la columna
          montoEsperado:
            detalle?.monto != null
              ? String(detalle.monto)
              : f.valorCuota != null
                ? String(f.valorCuota)
                : null,
          fechaVencimiento: detalle?.estado === "pendiente" ? fechaVencimiento : null,
          fechaPago: detalle?.estado === "pagada" ? detalle.fechaPago : null,
          estado: (detalle?.estado ?? "pendiente") as "pagada" | "pendiente",
        };
      });
      await db.insert(cuotasAcuerdo).values(cuotasToInsert);

      importados++;
      if (!existentes) acuerdosExistentes.set(procesoId, new Set());
      acuerdosExistentes.get(procesoId)!.add(numeroNorm);
    } catch (err) {
      fallidos++;
      const msg = err instanceof Error ? err.message : String(err);
      errores.push(`Fila ${f.noComparendo} / ${f.noAcuerdo}: ${msg}`);
    }
  }

  const estadoFinal =
    fallidos > 0
      ? importados > 0
        ? "completado_con_errores"
        : "fallido"
      : "completado";

  await db
    .update(importacionesAcuerdos)
    .set({
      importados,
      omitidos,
      fallidos,
      estado: estadoFinal,
    })
    .where(eq(importacionesAcuerdos.id, importacionId));

  revalidatePath("/procesos");
  revalidatePath("/");
  return {
    ok: true,
    importacionId,
    nombreArchivo: file.name,
    importados,
    omitidos,
    fallidos,
    errores,
  };
}
