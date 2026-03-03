"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { procesos, ordenComparendo } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

export async function obtenerOrdenComparendoPorProceso(procesoId: number) {
  const [row] = await db
    .select()
    .from(ordenComparendo)
    .where(eq(ordenComparendo.procesoId, procesoId));
  return row ?? null;
}

export async function subirOrdenComparendo(
  procesoId: number,
  archivo: File,
  visible: boolean = true
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

    const [existe] = await db
      .select({ id: ordenComparendo.id })
      .from(ordenComparendo)
      .where(eq(ordenComparendo.procesoId, procesoId));
    if (existe) return { error: "Este proceso ya tiene un documento de orden de comparendo. Reemplázalo o elimínalo primero." };

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
      rutaArchivo,
      nombreOriginal: archivo.name,
      mimeType: archivo.type || "application/octet-stream",
      tamano: archivo.size,
      visible: !!visible,
    });

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al subir el documento de orden de comparendo." };
  }
}

export async function actualizarOrdenComparendo(
  procesoId: number,
  archivo?: File | null,
  visible?: boolean
): Promise<EstadoOrdenComparendo> {
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

    const [orden] = await db.select().from(ordenComparendo).where(eq(ordenComparendo.procesoId, procesoId));
    if (!orden) return { error: "No existe documento de orden de comparendo para este proceso." };

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
        ...(typeof visible === "boolean" && { visible }),
        actualizadoEn: new Date(),
      })
      .where(eq(ordenComparendo.procesoId, procesoId));

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al actualizar el documento de orden de comparendo." };
  }
}

export async function actualizarVisibleOrdenComparendo(
  procesoId: number,
  visible: boolean
): Promise<EstadoOrdenComparendo> {
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

    await db
      .update(ordenComparendo)
      .set({ visible, actualizadoEn: new Date() })
      .where(eq(ordenComparendo.procesoId, procesoId));

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al actualizar la visibilidad." };
  }
}

export async function eliminarOrdenComparendo(procesoId: number): Promise<EstadoOrdenComparendo> {
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

    const [orden] = await db.select().from(ordenComparendo).where(eq(ordenComparendo.procesoId, procesoId));
    if (orden?.rutaArchivo) await deleteProcesoDocument(orden.rutaArchivo);

    await db.delete(ordenComparendo).where(eq(ordenComparendo.procesoId, procesoId));

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al eliminar el documento de orden de comparendo." };
  }
}
