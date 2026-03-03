"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import {
  procesos,
  contribuyentes,
  ordenComparendo,
  importacionesComparendos,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { clavesParaBusqueda } from "@/lib/utils/normalizar-comparendo";
import { saveOrdenComparendoDocument } from "@/lib/uploads";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilaPreviewComparendo {
  nombreArchivo: string;
  noComparendo: string;
  estado: "match" | "ya_tiene_doc" | "sin_match";
  procesoId: number | null;
  contribuyenteNombre: string | null;
  documentosExistentes: number;
}

export type PreviewComparendosResult =
  | {
      ok: true;
      filas: FilaPreviewComparendo[];
      totalArchivos: number;
      resumen: { conMatch: number; yaTieneDoc: number; sinMatch: number };
    }
  | { ok: false; error: string };

export type ImportComparendosResult =
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

async function loadDocumentosExistentes(
  procesoIds: number[]
): Promise<Map<number, number>> {
  if (procesoIds.length === 0) return new Map();
  const rows = await db
    .select({ procesoId: ordenComparendo.procesoId })
    .from(ordenComparendo)
    .where(inArray(ordenComparendo.procesoId, procesoIds));

  const countMap = new Map<number, number>();
  for (const r of rows) {
    countMap.set(r.procesoId, (countMap.get(r.procesoId) ?? 0) + 1);
  }
  return countMap;
}

function isPdfFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".pdf");
}

// ─── Preview ──────────────────────────────────────────────────────────────────

export async function previewImportacionComparendos(
  formData: FormData
): Promise<PreviewComparendosResult> {
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
  const preview: Array<{
    nombreArchivo: string;
    noComparendo: string;
    procesoId: number | null;
    contribuyenteNombre: string | null;
  }> = [];

  for (const archivo of pdfFiles) {
    const noComparendo = extractNoComparendo(archivo.name);
    const entry = buscarEnIndice(noComparendo, indice);
    preview.push({
      nombreArchivo: archivo.name,
      noComparendo,
      procesoId: entry?.procesoId ?? null,
      contribuyenteNombre: entry?.contribuyenteNombre ?? null,
    });
    if (entry) matchProcesoIds.push(entry.procesoId);
  }

  const docCountMap = await loadDocumentosExistentes(matchProcesoIds);

  let conMatch = 0;
  let yaTieneDoc = 0;
  let sinMatch = 0;

  const filas: FilaPreviewComparendo[] = preview.map((p) => {
    const docCount = p.procesoId != null ? (docCountMap.get(p.procesoId) ?? 0) : 0;
    let estado: FilaPreviewComparendo["estado"];
    if (p.procesoId == null) {
      estado = "sin_match";
      sinMatch++;
    } else if (docCount > 0) {
      estado = "ya_tiene_doc";
      yaTieneDoc++;
    } else {
      estado = "match";
      conMatch++;
    }
    return {
      nombreArchivo: p.nombreArchivo,
      noComparendo: p.noComparendo,
      estado,
      procesoId: p.procesoId,
      contribuyenteNombre: p.contribuyenteNombre,
      documentosExistentes: docCount,
    };
  });

  return {
    ok: true,
    filas,
    totalArchivos: pdfFiles.length,
    resumen: { conMatch, yaTieneDoc, sinMatch },
  };
}

// ─── Ejecutar importación ─────────────────────────────────────────────────────

export async function ejecutarImportacionComparendos(
  formData: FormData
): Promise<ImportComparendosResult> {
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

  const classified: Array<{
    archivo: File;
    noComparendo: string;
    procesoId: number | null;
  }> = [];

  const matchProcesoIds: number[] = [];
  for (const archivo of pdfFiles) {
    const noComparendo = extractNoComparendo(archivo.name);
    const entry = buscarEnIndice(noComparendo, indice);
    classified.push({ archivo, noComparendo, procesoId: entry?.procesoId ?? null });
    if (entry) matchProcesoIds.push(entry.procesoId);
  }

  const docCountMap = await loadDocumentosExistentes(matchProcesoIds);

  const [importacionRow] = await db
    .insert(importacionesComparendos)
    .values({
      usuarioId: session.user.id,
      totalArchivos: pdfFiles.length,
    })
    .returning({ id: importacionesComparendos.id });

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

    const docCount = docCountMap.get(procesoId) ?? 0;
    if (docCount > 0) {
      omitidos++;
      continue;
    }

    try {
      const buffer = Buffer.from(await archivo.arrayBuffer());
      const rutaArchivo = await saveOrdenComparendoDocument(
        procesoId,
        buffer,
        archivo.name,
        "application/pdf"
      );

      await db.insert(ordenComparendo).values({
        procesoId,
        subidoPorId: session.user.id,
        rutaArchivo,
        nombreOriginal: archivo.name,
        mimeType: "application/pdf",
        tamano: archivo.size,
        legible: true,
      });

      // Mark as having a doc so subsequent files for same process are skipped
      docCountMap.set(procesoId, (docCountMap.get(procesoId) ?? 0) + 1);
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
    .update(importacionesComparendos)
    .set({ importados, omitidos, fallidos, estado: estadoFinal })
    .where(eq(importacionesComparendos.id, importacionId));

  revalidatePath("/procesos");
  revalidatePath("/");

  return {
    ok: true,
    importacionId,
    importados,
    omitidos,
    fallidos,
    errores,
  };
}
