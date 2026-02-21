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

function validarCuotas(cuotas: number | null): { error?: string; value?: number } {
  if (cuotas == null || !Number.isInteger(cuotas) || cuotas < 1) {
    return { error: "El número de cuotas es obligatorio y debe ser al menos 1." };
  }
  return { value: cuotas };
}

function validarPorcentajeCuotaInicial(porcentaje: number | null): { error?: string; value?: string } {
  if (porcentaje == null || Number.isNaN(porcentaje)) {
    return { error: "El porcentaje de la cuota inicial es obligatorio." };
  }
  const n = Number(porcentaje);
  if (n < 0 || n > 100) {
    return { error: "El porcentaje de la cuota inicial debe estar entre 0 y 100." };
  }
  return { value: n.toFixed(2) };
}

function validarDiaCobroMes(dia: number | null): { error?: string; value?: number } {
  if (dia == null || !Number.isInteger(dia) || dia < 1 || dia > 31) {
    return { error: "El día del mes de cobro es obligatorio y debe estar entre 1 y 31." };
  }
  return { value: dia };
}

export async function crearAcuerdoPago(
  procesoId: number,
  numeroAcuerdo: string,
  fechaAcuerdo: string | null,
  fechaInicio: string | null,
  cuotas: number | null,
  porcentajeCuotaInicial: number | null,
  diaCobroMes: number | null
): Promise<EstadoAcuerdoPago> {
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  const numero = numeroAcuerdo?.trim();
  if (!numero) return { error: "El número del acuerdo es obligatorio." };

  const rCuotas = validarCuotas(cuotas);
  if (rCuotas.error) return { error: rCuotas.error };
  const rPorcentaje = validarPorcentajeCuotaInicial(porcentajeCuotaInicial);
  if (rPorcentaje.error) return { error: rPorcentaje.error };
  const rDia = validarDiaCobroMes(diaCobroMes);
  if (rDia.error) return { error: rDia.error };

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
      cuotas: rCuotas.value!,
      porcentajeCuotaInicial: rPorcentaje.value!,
      diaCobroMes: rDia.value!,
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
  cuotas: number | null,
  porcentajeCuotaInicial: number | null,
  diaCobroMes: number | null
): Promise<EstadoAcuerdoPago> {
  if (!Number.isInteger(id) || id < 1) return { error: "Acuerdo inválido." };
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  const numero = numeroAcuerdo?.trim();
  if (!numero) return { error: "El número del acuerdo es obligatorio." };

  const rCuotas = validarCuotas(cuotas);
  if (rCuotas.error) return { error: rCuotas.error };
  const rPorcentaje = validarPorcentajeCuotaInicial(porcentajeCuotaInicial);
  if (rPorcentaje.error) return { error: rPorcentaje.error };
  const rDia = validarDiaCobroMes(diaCobroMes);
  if (rDia.error) return { error: rDia.error };

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
        cuotas: rCuotas.value!,
        porcentajeCuotaInicial: rPorcentaje.value!,
        diaCobroMes: rDia.value!,
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
