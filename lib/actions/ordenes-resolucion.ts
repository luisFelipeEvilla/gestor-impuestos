"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { procesos, ordenesResolucion } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { saveOrdenResolucionDocument, deleteProcesoDocument, isAllowedMime, isAllowedSize } from "@/lib/uploads";

function puedeAccederProceso(
  rol: string | undefined,
  usuarioId: number | undefined,
  asignadoAId: number | null
): boolean {
  if (rol === "admin") return true;
  if (usuarioId == null) return false;
  return asignadoAId === usuarioId;
}

export type EstadoOrdenResolucion = { error?: string };

export async function obtenerOrdenResolucionPorProceso(procesoId: number) {
  const [row] = await db
    .select()
    .from(ordenesResolucion)
    .where(eq(ordenesResolucion.procesoId, procesoId));
  return row ?? null;
}

export async function crearOrdenResolucion(
  procesoId: number,
  numeroResolucion: string,
  fechaResolucion: string | null,
  archivo?: File | null
): Promise<EstadoOrdenResolucion> {
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  const numero = numeroResolucion?.trim();
  if (!numero) return { error: "El número de resolución es obligatorio." };

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
      .select({ id: ordenesResolucion.id })
      .from(ordenesResolucion)
      .where(eq(ordenesResolucion.procesoId, procesoId));
    if (existe) return { error: "Este proceso ya tiene una orden de resolución. Edítala o elimínala primero." };

    let rutaArchivo: string | null = null;
    let nombreOriginal: string | null = null;
    let mimeType: string | null = null;
    let tamano: number | null = null;

    if (archivo && archivo.size > 0) {
      if (!isAllowedMime(archivo.type)) return { error: "Tipo de archivo no permitido. Usa PDF, imágenes, Word, Excel o texto." };
      if (!isAllowedSize(archivo.size)) return { error: "El archivo supera el tamaño máximo permitido (10 MB)." };
      const buffer = Buffer.from(await archivo.arrayBuffer());
      rutaArchivo = await saveOrdenResolucionDocument(procesoId, buffer, archivo.name, archivo.type || "application/octet-stream");
      nombreOriginal = archivo.name;
      mimeType = archivo.type || "application/octet-stream";
      tamano = archivo.size;
    }

    await db.insert(ordenesResolucion).values({
      procesoId,
      numeroResolucion: numero,
      fechaResolucion: fechaResolucion?.trim() ? fechaResolucion.trim().slice(0, 10) : null,
      rutaArchivo,
      nombreOriginal,
      mimeType,
      tamano,
    });

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath(`/procesos/${procesoId}/editar`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al crear la orden de resolución." };
  }
}

export async function actualizarOrdenResolucion(
  procesoId: number,
  numeroResolucion: string,
  fechaResolucion: string | null,
  archivo?: File | null
): Promise<EstadoOrdenResolucion> {
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  const numero = numeroResolucion?.trim();
  if (!numero) return { error: "El número de resolución es obligatorio." };

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

    const [orden] = await db.select().from(ordenesResolucion).where(eq(ordenesResolucion.procesoId, procesoId));
    if (!orden) return { error: "No existe orden de resolución para este proceso." };

    let rutaArchivo = orden.rutaArchivo;
    let nombreOriginal = orden.nombreOriginal;
    let mimeType = orden.mimeType;
    let tamano = orden.tamano;

    if (archivo && archivo.size > 0) {
      if (!isAllowedMime(archivo.type)) return { error: "Tipo de archivo no permitido." };
      if (!isAllowedSize(archivo.size)) return { error: "El archivo supera el tamaño máximo (10 MB)." };
      if (orden.rutaArchivo) await deleteProcesoDocument(orden.rutaArchivo);
      const buffer = Buffer.from(await archivo.arrayBuffer());
      rutaArchivo = await saveOrdenResolucionDocument(procesoId, buffer, archivo.name, archivo.type || "application/octet-stream");
      nombreOriginal = archivo.name;
      mimeType = archivo.type || "application/octet-stream";
      tamano = archivo.size;
    }

    await db
      .update(ordenesResolucion)
      .set({
        numeroResolucion: numero,
        fechaResolucion: fechaResolucion?.trim() ? fechaResolucion.trim().slice(0, 10) : null,
        rutaArchivo,
        nombreOriginal,
        mimeType,
        tamano,
        actualizadoEn: new Date(),
      })
      .where(eq(ordenesResolucion.procesoId, procesoId));

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath(`/procesos/${procesoId}/editar`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al actualizar la orden de resolución." };
  }
}

export async function eliminarOrdenResolucion(procesoId: number): Promise<EstadoOrdenResolucion> {
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

    const [orden] = await db.select().from(ordenesResolucion).where(eq(ordenesResolucion.procesoId, procesoId));
    if (orden?.rutaArchivo) await deleteProcesoDocument(orden.rutaArchivo);

    await db.delete(ordenesResolucion).where(eq(ordenesResolucion.procesoId, procesoId));

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath(`/procesos/${procesoId}/editar`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al eliminar la orden de resolución." };
  }
}
