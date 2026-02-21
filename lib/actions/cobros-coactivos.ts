"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { procesos, cobrosCoactivos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

export async function obtenerCobroCoactivoPorProceso(procesoId: number) {
  const [row] = await db.select().from(cobrosCoactivos).where(eq(cobrosCoactivos.procesoId, procesoId));
  return row ?? null;
}

export async function crearCobroCoactivo(procesoId: number, fechaInicio: string): Promise<EstadoCobroCoactivo> {
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  const fecha = fechaInicio?.trim()?.slice(0, 10);
  if (!fecha) return { error: "La fecha de inicio es obligatoria." };

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

    const [existe] = await db.select({ id: cobrosCoactivos.id }).from(cobrosCoactivos).where(eq(cobrosCoactivos.procesoId, procesoId));
    if (existe) return { error: "Este proceso ya tiene un registro de cobro coactivo." };

    await db.insert(cobrosCoactivos).values({
      procesoId,
      fechaInicio: fecha,
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

export async function actualizarCobroCoactivo(procesoId: number, fechaInicio: string): Promise<EstadoCobroCoactivo> {
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  const fecha = fechaInicio?.trim()?.slice(0, 10);
  if (!fecha) return { error: "La fecha de inicio es obligatoria." };

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
      .set({ fechaInicio: fecha, actualizadoEn: new Date() })
      .where(eq(cobrosCoactivos.procesoId, procesoId));

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al actualizar el cobro coactivo." };
  }
}

export async function eliminarCobroCoactivo(procesoId: number): Promise<EstadoCobroCoactivo> {
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

    await db.delete(cobrosCoactivos).where(eq(cobrosCoactivos.procesoId, procesoId));

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al eliminar el cobro coactivo." };
  }
}
