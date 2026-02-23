"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { procesos, cobrosCoactivos } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";

function puedeAccederProceso(
  rol: string | undefined,
  usuarioId: number | undefined,
  asignadoAId: number | null
): boolean {
  if (rol === "admin") return true;
  if (usuarioId == null) return false;
  return asignadoAId === usuarioId;
}

export type EstadoCobroCoactivo = { error?: string };

/** Devuelve todos los cobros coactivos del proceso, del más reciente al más antiguo. */
export async function obtenerCobrosCoactivosPorProceso(procesoId: number) {
  return db
    .select()
    .from(cobrosCoactivos)
    .where(eq(cobrosCoactivos.procesoId, procesoId))
    .orderBy(desc(cobrosCoactivos.creadoEn));
}

/** Devuelve solo el cobro coactivo activo (vigente) del proceso, o null. */
export async function obtenerCobroCoactivoActivoPorProceso(procesoId: number) {
  const [row] = await db
    .select()
    .from(cobrosCoactivos)
    .where(and(eq(cobrosCoactivos.procesoId, procesoId), eq(cobrosCoactivos.activo, true)))
    .orderBy(desc(cobrosCoactivos.creadoEn));
  return row ?? null;
}

/**
 * Crea un nuevo cobro coactivo para el proceso.
 * Desactiva automáticamente cualquier cobro activo anterior.
 */
export async function crearCobroCoactivo(
  procesoId: number,
  fechaInicio: string,
  noCoactivo?: string | null
): Promise<EstadoCobroCoactivo> {
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  const fecha = fechaInicio?.trim()?.slice(0, 10);
  if (!fecha) return { error: "La fecha es obligatoria." };

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
      .update(cobrosCoactivos)
      .set({ activo: false, actualizadoEn: new Date() })
      .where(and(eq(cobrosCoactivos.procesoId, procesoId), eq(cobrosCoactivos.activo, true)));

    await db.insert(cobrosCoactivos).values({
      procesoId,
      fechaInicio: fecha,
      noCoactivo: noCoactivo?.trim() || null,
      activo: true,
    });

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al crear el cobro coactivo." };
  }
}

/** Actualiza un cobro coactivo por su ID. */
export async function actualizarCobroCoactivo(
  cobroId: number,
  procesoId: number,
  fechaInicio: string,
  noCoactivo?: string | null
): Promise<EstadoCobroCoactivo> {
  if (!Number.isInteger(cobroId) || cobroId < 1) return { error: "Cobro inválido." };
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  const fecha = fechaInicio?.trim()?.slice(0, 10);
  if (!fecha) return { error: "La fecha es obligatoria." };

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
      .update(cobrosCoactivos)
      .set({
        fechaInicio: fecha,
        noCoactivo: noCoactivo == null ? null : (noCoactivo.trim() || null),
        actualizadoEn: new Date(),
      })
      .where(eq(cobrosCoactivos.id, cobroId));

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al actualizar el cobro coactivo." };
  }
}

/** Wrapper para formulario: actualiza No Coactivo y Fecha desde FormData. */
export async function actualizarDatosCobroCoactivoForm(
  _prev: EstadoCobroCoactivo | null,
  formData: FormData
): Promise<EstadoCobroCoactivo> {
  const cobroId = Number(formData.get("cobroId"));
  const procesoId = Number(formData.get("procesoId"));
  const fechaInicio = (formData.get("fechaInicio") as string)?.trim() ?? "";
  const noCoactivo = (formData.get("noCoactivo") as string)?.trim() || null;
  return actualizarCobroCoactivo(cobroId, procesoId, fechaInicio, noCoactivo);
}

/** Elimina un cobro coactivo por su ID. */
export async function eliminarCobroCoactivo(
  cobroId: number,
  procesoId: number
): Promise<EstadoCobroCoactivo> {
  if (!Number.isInteger(cobroId) || cobroId < 1) return { error: "Cobro inválido." };
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

    await db.delete(cobrosCoactivos).where(eq(cobrosCoactivos.id, cobroId));

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al eliminar el cobro coactivo." };
  }
}
