"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { procesos, ordenComparendo } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import {
  saveOrdenComparendoDocument,
  deleteProcesoDocument,
  isAllowedMime,
  isAllowedSize,
} from "@/lib/uploads";

function puedeAccederProceso(
  rol: string | undefined,
  usuarioId: number | undefined,
  asignadoAId: number | null
): boolean {
  if (rol === "admin") return true;
  if (usuarioId == null) return false;
  return asignadoAId === usuarioId;
}

export type EstadoOrdenComparendo = { error?: string };

/** Lista todos los documentos de comparendo del proceso (más recientes primero). */
export async function listarOrdenesComparendoPorProceso(procesoId: number) {
  return db
    .select()
    .from(ordenComparendo)
    .where(eq(ordenComparendo.procesoId, procesoId))
    .orderBy(desc(ordenComparendo.creadoEn));
}

export async function subirOrdenComparendo(
  procesoId: number,
  archivo: File,
  legible: boolean = true
): Promise<EstadoOrdenComparendo> {
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  if (!archivo?.size) return { error: "Debes seleccionar un archivo." };

  try {
    const session = await getSession();
    const [proceso] = await db
      .select({ id: procesos.id, asignadoAId: procesos.asignadoAId })
      .from(procesos)
      .where(eq(procesos.id, procesoId));
    if (!proceso) return { error: "Proceso no encontrado." };
    if (!puedeAccederProceso(session?.user?.rol, session?.user?.id, proceso.asignadoAId ?? null)) {
      return { error: "No tienes permiso para gestionar este proceso." };
    }

    if (!isAllowedMime(archivo.type)) return { error: "Tipo de archivo no permitido. Usa PDF, imágenes, Word, Excel o texto." };
    if (!isAllowedSize(archivo.size)) return { error: "El archivo supera el tamaño máximo permitido (10 MB)." };

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const rutaArchivo = await saveOrdenComparendoDocument(
      procesoId,
      buffer,
      archivo.name,
      archivo.type || "application/octet-stream"
    );

    await db.insert(ordenComparendo).values({
      procesoId,
      subidoPorId: session?.user?.id ?? null,
      rutaArchivo,
      nombreOriginal: archivo.name,
      mimeType: archivo.type || "application/octet-stream",
      tamano: archivo.size,
      legible: !!legible,
    });

    revalidatePath(`/comparendos/${procesoId}`);
    revalidatePath("/comparendos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al subir el documento de comparendo." };
  }
}

export async function actualizarOrdenComparendo(
  documentoId: number,
  procesoId: number,
  archivo?: File | null,
  legible?: boolean
): Promise<EstadoOrdenComparendo> {
  if (!Number.isInteger(documentoId) || documentoId < 1) return { error: "Documento inválido." };
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };

  try {
    const session = await getSession();
    const [proceso] = await db
      .select({ id: procesos.id, asignadoAId: procesos.asignadoAId })
      .from(procesos)
      .where(eq(procesos.id, procesoId));
    if (!proceso) return { error: "Proceso no encontrado." };
    if (!puedeAccederProceso(session?.user?.rol, session?.user?.id, proceso.asignadoAId ?? null)) {
      return { error: "No tienes permiso para gestionar este proceso." };
    }

    const [orden] = await db
      .select()
      .from(ordenComparendo)
      .where(eq(ordenComparendo.id, documentoId));
    if (!orden || orden.procesoId !== procesoId) return { error: "Documento no encontrado." };

    let rutaArchivo = orden.rutaArchivo;
    let nombreOriginal = orden.nombreOriginal;
    let mimeType = orden.mimeType;
    let tamano = orden.tamano;

    if (archivo && archivo.size > 0) {
      if (!isAllowedMime(archivo.type)) return { error: "Tipo de archivo no permitido." };
      if (!isAllowedSize(archivo.size)) return { error: "El archivo supera el tamaño máximo (10 MB)." };
      await deleteProcesoDocument(orden.rutaArchivo);
      const buffer = Buffer.from(await archivo.arrayBuffer());
      rutaArchivo = await saveOrdenComparendoDocument(
        procesoId,
        buffer,
        archivo.name,
        archivo.type || "application/octet-stream"
      );
      nombreOriginal = archivo.name;
      mimeType = archivo.type || "application/octet-stream";
      tamano = archivo.size;
    }

    await db
      .update(ordenComparendo)
      .set({
        rutaArchivo,
        nombreOriginal,
        mimeType,
        tamano,
        ...(typeof legible === "boolean" && { legible }),
        actualizadoEn: new Date(),
      })
      .where(eq(ordenComparendo.id, documentoId));

    revalidatePath(`/comparendos/${procesoId}`);
    revalidatePath("/comparendos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al actualizar el documento." };
  }
}

export async function actualizarLegibleOrdenComparendo(
  documentoId: number,
  procesoId: number,
  legible: boolean
): Promise<EstadoOrdenComparendo> {
  if (!Number.isInteger(documentoId) || documentoId < 1) return { error: "Documento inválido." };
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };

  try {
    const session = await getSession();
    const [proceso] = await db
      .select({ id: procesos.id, asignadoAId: procesos.asignadoAId })
      .from(procesos)
      .where(eq(procesos.id, procesoId));
    if (!proceso) return { error: "Proceso no encontrado." };
    if (!puedeAccederProceso(session?.user?.rol, session?.user?.id, proceso.asignadoAId ?? null)) {
      return { error: "No tienes permiso para gestionar este proceso." };
    }

    const [orden] = await db
      .select({ id: ordenComparendo.id, procesoId: ordenComparendo.procesoId })
      .from(ordenComparendo)
      .where(eq(ordenComparendo.id, documentoId));
    if (!orden || orden.procesoId !== procesoId) return { error: "Documento no encontrado." };

    await db
      .update(ordenComparendo)
      .set({ legible, actualizadoEn: new Date() })
      .where(eq(ordenComparendo.id, documentoId));

    revalidatePath(`/comparendos/${procesoId}`);
    revalidatePath("/comparendos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al actualizar la legibilidad." };
  }
}

export async function eliminarOrdenComparendo(
  documentoId: number,
  procesoId: number
): Promise<EstadoOrdenComparendo> {
  if (!Number.isInteger(documentoId) || documentoId < 1) return { error: "Documento inválido." };
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };

  try {
    const session = await getSession();
    const [proceso] = await db
      .select({ id: procesos.id, asignadoAId: procesos.asignadoAId })
      .from(procesos)
      .where(eq(procesos.id, procesoId));
    if (!proceso) return { error: "Proceso no encontrado." };
    if (!puedeAccederProceso(session?.user?.rol, session?.user?.id, proceso.asignadoAId ?? null)) {
      return { error: "No tienes permiso para gestionar este proceso." };
    }

    const [orden] = await db
      .select()
      .from(ordenComparendo)
      .where(eq(ordenComparendo.id, documentoId));
    if (!orden || orden.procesoId !== procesoId) return { error: "Documento no encontrado." };

    await deleteProcesoDocument(orden.rutaArchivo);
    await db.delete(ordenComparendo).where(eq(ordenComparendo.id, documentoId));

    revalidatePath(`/comparendos/${procesoId}`);
    revalidatePath("/comparendos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al eliminar el documento." };
  }
}

/** Para uso desde formulario: lee documentoId y procesoId del FormData. */
export async function eliminarOrdenComparendoDesdeFormData(
  formData: FormData
): Promise<EstadoOrdenComparendo> {
  const documentoId = Number(formData.get("documentoId"));
  const procesoId = Number(formData.get("procesoId"));
  return eliminarOrdenComparendo(documentoId, procesoId);
}

/** Para uso desde formulario: lee documentoId, procesoId y legible del FormData. */
export async function actualizarLegibleOrdenComparendoDesdeFormData(
  formData: FormData
): Promise<EstadoOrdenComparendo> {
  const documentoId = Number(formData.get("documentoId"));
  const procesoId = Number(formData.get("procesoId"));
  const legible = formData.get("legible") === "true";
  return actualizarLegibleOrdenComparendo(documentoId, procesoId, legible);
}
