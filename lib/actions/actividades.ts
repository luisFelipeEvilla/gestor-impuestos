"use server";

import { db } from "@/lib/db";
import { actividades, obligaciones } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export type ActividadOption = {
  id: number;
  codigo: string;
  descripcion: string;
  orden: number;
  obligacionId?: number | null;
};

export type ActividadParaForm = {
  id: number;
  codigo: string;
  descripcion: string;
};

export type ObligacionConActividades = {
  id: number;
  descripcion: string;
  orden: number;
  actividades: ActividadParaForm[];
};

/**
 * Lista obligaciones activas con sus actividades, para el formulario de actas.
 * El usuario elige una obligación en un desplegable y luego selecciona actividades de esa obligación.
 */
export async function obtenerObligacionesConActividades(): Promise<ObligacionConActividades[]> {
  const obligacionesRows = await db
    .select({
      id: obligaciones.id,
      descripcion: obligaciones.descripcion,
      orden: obligaciones.orden,
    })
    .from(obligaciones)
    .where(eq(obligaciones.activo, true))
    .orderBy(asc(obligaciones.orden), asc(obligaciones.id));

  const actividadesRows = await db
    .select({
      id: actividades.id,
      codigo: actividades.codigo,
      descripcion: actividades.descripcion,
      obligacionId: actividades.obligacionId,
      orden: actividades.orden,
    })
    .from(actividades)
    .where(eq(actividades.activo, true))
    .orderBy(asc(actividades.orden), asc(actividades.id));

  const byObligacion = new Map<number, ActividadParaForm[]>();
  for (const a of actividadesRows) {
    const obligacionId = a.obligacionId ?? 0;
    if (!byObligacion.has(obligacionId)) byObligacion.set(obligacionId, []);
    byObligacion.get(obligacionId)!.push({
      id: a.id,
      codigo: a.codigo,
      descripcion: a.descripcion,
    });
  }

  const resultado: ObligacionConActividades[] = [];
  const sinClasificar = byObligacion.get(0) ?? [];
  if (sinClasificar.length > 0) {
    resultado.push({
      id: 0,
      descripcion: "Todas las actividades",
      orden: 0,
      actividades: sinClasificar,
    });
  }
  for (const o of obligacionesRows) {
    const acts = byObligacion.get(o.id) ?? [];
    resultado.push({
      id: o.id,
      descripcion: o.descripcion,
      orden: o.orden,
      actividades: acts,
    });
  }
  return resultado;
}

/**
 * Lista actividades activas (planas) para compatibilidad.
 * Ordenadas por campo orden.
 */
export async function obtenerActividadesActivas(): Promise<ActividadOption[]> {
  const rows = await db
    .select({
      id: actividades.id,
      codigo: actividades.codigo,
      descripcion: actividades.descripcion,
      orden: actividades.orden,
      obligacionId: actividades.obligacionId,
    })
    .from(actividades)
    .where(eq(actividades.activo, true))
    .orderBy(asc(actividades.orden), asc(actividades.id));
  return rows;
}
