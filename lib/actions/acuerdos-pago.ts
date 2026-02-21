"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { procesos, acuerdosPago } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
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

export type EstadoAcuerdoPago = { error?: string };

export async function listarAcuerdosPagoPorProceso(procesoId: number) {
  return db
    .select()
    .from(acuerdosPago)
    .where(eq(acuerdosPago.procesoId, procesoId))
    .orderBy(desc(acuerdosPago.creadoEn));
}

export async function crearAcuerdoPago(
  procesoId: number,
  numeroAcuerdo: string,
  fechaAcuerdo: string | null,
  fechaInicio: string | null,
  cuotas: number | null
): Promise<EstadoAcuerdoPago> {
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  const numero = numeroAcuerdo?.trim();
  if (!numero) return { error: "El número del acuerdo es obligatorio." };

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

    await db.insert(acuerdosPago).values({
      procesoId,
      numeroAcuerdo: numero,
      fechaAcuerdo: fechaAcuerdo?.trim() ? fechaAcuerdo.trim().slice(0, 10) : null,
      fechaInicio: fechaInicio?.trim() ? fechaInicio.trim().slice(0, 10) : null,
      cuotas: cuotas != null && Number.isInteger(cuotas) && cuotas >= 0 ? cuotas : null,
    });

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al crear el acuerdo de pago." };
  }
}

export async function actualizarAcuerdoPago(
  id: number,
  procesoId: number,
  numeroAcuerdo: string,
  fechaAcuerdo: string | null,
  fechaInicio: string | null,
  cuotas: number | null
): Promise<EstadoAcuerdoPago> {
  if (!Number.isInteger(id) || id < 1) return { error: "Acuerdo inválido." };
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  const numero = numeroAcuerdo?.trim();
  if (!numero) return { error: "El número del acuerdo es obligatorio." };

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

    const [acuerdo] = await db.select().from(acuerdosPago).where(eq(acuerdosPago.id, id));
    if (!acuerdo || acuerdo.procesoId !== procesoId) return { error: "Acuerdo no encontrado." };

    await db
      .update(acuerdosPago)
      .set({
        numeroAcuerdo: numero,
        fechaAcuerdo: fechaAcuerdo?.trim() ? fechaAcuerdo.trim().slice(0, 10) : null,
        fechaInicio: fechaInicio?.trim() ? fechaInicio.trim().slice(0, 10) : null,
        cuotas: cuotas != null && Number.isInteger(cuotas) && cuotas >= 0 ? cuotas : null,
        actualizadoEn: new Date(),
      })
      .where(eq(acuerdosPago.id, id));

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al actualizar el acuerdo de pago." };
  }
}

export async function eliminarAcuerdoPago(id: number, procesoId: number): Promise<EstadoAcuerdoPago> {
  if (!Number.isInteger(id) || id < 1) return { error: "Acuerdo inválido." };

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

    const [acuerdo] = await db.select().from(acuerdosPago).where(eq(acuerdosPago.id, id));
    if (!acuerdo || acuerdo.procesoId !== procesoId) return { error: "Acuerdo no encontrado." };

    await db.delete(acuerdosPago).where(eq(acuerdosPago.id, id));

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") throw err;
    console.error(err);
    return { error: "Error al eliminar el acuerdo de pago." };
  }
}
