"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import {
  procesos,
  contribuyentes,
  ordenesResolucion,
  importacionesResoluciones,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { clavesParaBusqueda } from "@/lib/utils/normalizar-comparendo";
import { saveOrdenResolucionDocument } from "@/lib/uploads";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilaPreviewResolucion {
  nombreArchivo: string;
  noComparendo: string;
  /** match = se importará (crea o actualiza el registro de resolución)
   *  ya_tiene_archivo = ya tiene un PDF adjunto, se omitirá
   *  sin_match = no se encontró proceso con ese comparendo */
  estado: "match" | "ya_tiene_archivo" | "sin_match";
  procesoId: number | null;
  contribuyenteNombre: string | null;
  /** true si el proceso ya tiene un registro en ordenes_resolucion (aunque sin archivo) */
  tieneRegistro: boolean;
}

export type PreviewResolucionesResult =
  | {
      ok: true;
      filas: FilaPreviewResolucion[];
      totalArchivos: number;
      resumen: { conMatch: number; yaTieneArchivo: number; sinMatch: number };
    }
  | { ok: false; error: string };

export type ImportResolucionesResult =
  | {
      ok: true;
      importacionId: number;
      importados: number;
      omitidos: number;
      fallidos: number;
      errores: string[];
    }
  | { ok: false; error: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractNoComparendo(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").trim();
}

function isPdfFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".pdf");
}

async function buildIndiceProcesos(): Promise<
  Map<string, { procesoId: number; contribuyenteNombre: string | null }>
> {
  const rows = await db
    .select({
      id: procesos.id,
      noComparendo: procesos.noComparendo,
      nombreRazonSocial: contribuyentes.nombreRazonSocial,
    })
    .from(procesos)
    .leftJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id));

  const indice = new Map<
    string,
    { procesoId: number; contribuyenteNombre: string | null }
  >();
  for (const r of rows) {
    const keys = clavesParaBusqueda(r.noComparendo ?? "");
    const entry = {
      procesoId: r.id,
      contribuyenteNombre: r.nombreRazonSocial ?? null,
    };
    for (const k of keys) {
      if (k) indice.set(k, entry);
    }
  }
  return indice;
}

function buscarEnIndice(
  noComparendo: string,
  indice: Map<string, { procesoId: number; contribuyenteNombre: string | null }>
): { procesoId: number; contribuyenteNombre: string | null } | null {
  const candidatos = clavesParaBusqueda(noComparendo);
  const seen = new Set<string>();
  for (const c of candidatos) {
    if (!c || seen.has(c)) continue;
    seen.add(c);
    const sinCeros = c.replace(/^0+/, "") || "0";
    if (indice.has(c)) return indice.get(c)!;
    if (indice.has(sinCeros)) return indice.get(sinCeros)!;
  }
  return null;
}

/** Returns a map of procesoId → { id, rutaArchivo } for existing ordenes_resolucion records. */
async function loadOrdenesResolucion(
  procesoIds: number[]
): Promise<Map<number, { id: number; rutaArchivo: string | null }>> {
  if (procesoIds.length === 0) return new Map();
  const rows = await db
    .select({
      procesoId: ordenesResolucion.procesoId,
      id: ordenesResolucion.id,
      rutaArchivo: ordenesResolucion.rutaArchivo,
    })
    .from(ordenesResolucion)
    .where(inArray(ordenesResolucion.procesoId, procesoIds));

  return new Map(rows.map((r) => [r.procesoId, { id: r.id, rutaArchivo: r.rutaArchivo ?? null }]));
}

// ─── Preview ──────────────────────────────────────────────────────────────────

export async function previewImportacionResoluciones(
  formData: FormData
): Promise<PreviewResolucionesResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "No autorizado" };

  const archivos = formData.getAll("archivos");
  const pdfFiles = archivos.filter(
    (f): f is File => f instanceof File && isPdfFile(f)
  );

  if (pdfFiles.length === 0) {
    return {
      ok: false,
      error: "No se encontraron archivos PDF válidos. Seleccione archivos con extensión .pdf",
    };
  }

  const indice = await buildIndiceProcesos();

  const matchProcesoIds: number[] = [];
  const preClasificados: Array<{
    nombreArchivo: string;
    noComparendo: string;
    procesoId: number | null;
    contribuyenteNombre: string | null;
  }> = [];

  for (const archivo of pdfFiles) {
    const noComparendo = extractNoComparendo(archivo.name);
    const entry = buscarEnIndice(noComparendo, indice);
    preClasificados.push({
      nombreArchivo: archivo.name,
      noComparendo,
      procesoId: entry?.procesoId ?? null,
      contribuyenteNombre: entry?.contribuyenteNombre ?? null,
    });
    if (entry) matchProcesoIds.push(entry.procesoId);
  }

  const ordenesMap = await loadOrdenesResolucion(matchProcesoIds);

  let conMatch = 0;
  let yaTieneArchivo = 0;
  let sinMatch = 0;

  const filas: FilaPreviewResolucion[] = preClasificados.map((p) => {
    if (p.procesoId == null) {
      sinMatch++;
      return {
        nombreArchivo: p.nombreArchivo,
        noComparendo: p.noComparendo,
        estado: "sin_match",
        procesoId: null,
        contribuyenteNombre: null,
        tieneRegistro: false,
      };
    }

    const orden = ordenesMap.get(p.procesoId);
    if (orden?.rutaArchivo) {
      yaTieneArchivo++;
      return {
        nombreArchivo: p.nombreArchivo,
        noComparendo: p.noComparendo,
        estado: "ya_tiene_archivo",
        procesoId: p.procesoId,
        contribuyenteNombre: p.contribuyenteNombre,
        tieneRegistro: true,
      };
    }

    conMatch++;
    return {
      nombreArchivo: p.nombreArchivo,
      noComparendo: p.noComparendo,
      estado: "match",
      procesoId: p.procesoId,
      contribuyenteNombre: p.contribuyenteNombre,
      tieneRegistro: orden != null,
    };
  });

  return {
    ok: true,
    filas,
    totalArchivos: pdfFiles.length,
    resumen: { conMatch, yaTieneArchivo, sinMatch },
  };
}

// ─── Ejecutar importación ─────────────────────────────────────────────────────

export async function ejecutarImportacionResoluciones(
  formData: FormData
): Promise<ImportResolucionesResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "No autorizado" };

  const archivos = formData.getAll("archivos");
  const pdfFiles = archivos.filter(
    (f): f is File => f instanceof File && isPdfFile(f)
  );

  if (pdfFiles.length === 0) {
    return { ok: false, error: "No hay archivos PDF para importar." };
  }

  const indice = await buildIndiceProcesos();

  const matchProcesoIds: number[] = [];
  const classified: Array<{
    archivo: File;
    noComparendo: string;
    procesoId: number | null;
  }> = [];

  for (const archivo of pdfFiles) {
    const noComparendo = extractNoComparendo(archivo.name);
    const entry = buscarEnIndice(noComparendo, indice);
    classified.push({ archivo, noComparendo, procesoId: entry?.procesoId ?? null });
    if (entry) matchProcesoIds.push(entry.procesoId);
  }

  const ordenesMap = await loadOrdenesResolucion(matchProcesoIds);

  const [importacionRow] = await db
    .insert(importacionesResoluciones)
    .values({
      usuarioId: session.user.id,
      totalArchivos: pdfFiles.length,
    })
    .returning({ id: importacionesResoluciones.id });

  if (!importacionRow) {
    return { ok: false, error: "No se pudo crear el registro de importación." };
  }
  const importacionId = importacionRow.id;

  let importados = 0;
  let omitidos = 0;
  let fallidos = 0;
  const errores: string[] = [];

  for (const item of classified) {
    const { archivo, noComparendo, procesoId } = item;

    if (procesoId == null) {
      omitidos++;
      continue;
    }

    const orden = ordenesMap.get(procesoId);
    if (orden?.rutaArchivo) {
      omitidos++;
      continue;
    }

    try {
      const buffer = Buffer.from(await archivo.arrayBuffer());
      const rutaArchivo = await saveOrdenResolucionDocument(
        procesoId,
        buffer,
        archivo.name,
        "application/pdf"
      );

      if (orden) {
        // Record exists but has no file — update it
        await db
          .update(ordenesResolucion)
          .set({
            rutaArchivo,
            nombreOriginal: archivo.name,
            mimeType: "application/pdf",
            tamano: archivo.size,
            actualizadoEn: new Date(),
          })
          .where(eq(ordenesResolucion.id, orden.id));
      } else {
        // No record yet — create one with the comparendo number as placeholder
        await db.insert(ordenesResolucion).values({
          procesoId,
          numeroResolucion: noComparendo,
          rutaArchivo,
          nombreOriginal: archivo.name,
          mimeType: "application/pdf",
          tamano: archivo.size,
        });
      }

      // Mark as done so subsequent files for the same process are skipped
      ordenesMap.set(procesoId, { id: orden?.id ?? 0, rutaArchivo });
      importados++;
    } catch (err) {
      fallidos++;
      const msg = err instanceof Error ? err.message : String(err);
      errores.push(`${archivo.name} (comparendo ${noComparendo}): ${msg}`);
    }
  }

  const estadoFinal =
    fallidos > 0
      ? importados > 0
        ? "completado_con_errores"
        : "fallido"
      : "completado";

  await db
    .update(importacionesResoluciones)
    .set({ importados, omitidos, fallidos, estado: estadoFinal })
    .where(eq(importacionesResoluciones.id, importacionId));

  revalidatePath("/procesos");
  revalidatePath("/");

  return { ok: true, importacionId, importados, omitidos, fallidos, errores };
}
