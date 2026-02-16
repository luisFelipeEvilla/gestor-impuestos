import { z } from "zod";
import { db } from "@/lib/db";
import {
  actasReunion,
  actasIntegrantes,
  actasReunionClientes,
  actasReunionActividades,
  compromisosActa,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { CompromisoFormItem } from "@/lib/actions/actas-types";
import { integrantesSchema } from "./parsers";

/** Snapshot serializable del acta para auditoría (antes/después en historial). */
export type SnapshotAuditoriaActa = {
  fecha: string;
  objetivo: string;
  contenido: string | null;
  integrantes: { nombre: string; email: string; tipo: string; cargo: string | null; solicitarAprobacionCorreo: boolean }[];
  clientesIds: number[];
  actividadesIds: number[];
  compromisos: { descripcion: string; fechaLimite: string | null; actaIntegranteId: number | null; clienteMiembroId: number | null }[];
};

export async function obtenerSnapshotAuditoriaActa(actaId: string): Promise<SnapshotAuditoriaActa | null> {
  const [acta] = await db
    .select({
      fecha: actasReunion.fecha,
      objetivo: actasReunion.objetivo,
      contenido: actasReunion.contenido,
    })
    .from(actasReunion)
    .where(eq(actasReunion.id, actaId));
  if (!acta) return null;

  const [integrantesRows, clientesRows, actividadesRows, compromisosRows] = await Promise.all([
    db
      .select({
        nombre: actasIntegrantes.nombre,
        email: actasIntegrantes.email,
        tipo: actasIntegrantes.tipo,
        cargo: actasIntegrantes.cargo,
        solicitarAprobacionCorreo: actasIntegrantes.solicitarAprobacionCorreo,
      })
      .from(actasIntegrantes)
      .where(eq(actasIntegrantes.actaId, actaId)),
    db
      .select({ clienteId: actasReunionClientes.clienteId })
      .from(actasReunionClientes)
      .where(eq(actasReunionClientes.actaId, actaId)),
    db
      .select({ actividadId: actasReunionActividades.actividadId })
      .from(actasReunionActividades)
      .where(eq(actasReunionActividades.actaId, actaId)),
    db
      .select({
        descripcion: compromisosActa.descripcion,
        fechaLimite: compromisosActa.fechaLimite,
        actaIntegranteId: compromisosActa.actaIntegranteId,
        clienteMiembroId: compromisosActa.clienteMiembroId,
      })
      .from(compromisosActa)
      .where(eq(compromisosActa.actaId, actaId)),
  ]);

  const fechaStr =
    typeof acta.fecha === "string"
      ? acta.fecha.slice(0, 10)
      : acta.fecha && typeof acta.fecha === "object" && "toISOString" in acta.fecha
        ? (acta.fecha as Date).toISOString().slice(0, 10)
        : String(acta.fecha).slice(0, 10);
  const toFechaStr = (v: unknown): string | null => {
    if (v == null) return null;
    if (typeof v === "string") return v.slice(0, 10);
    if (typeof v === "object" && v !== null && "toISOString" in v) return (v as Date).toISOString().slice(0, 10);
    return String(v).slice(0, 10);
  };
  return {
    fecha: fechaStr,
    objetivo: acta.objetivo,
    contenido: acta.contenido ?? null,
    integrantes: integrantesRows.map((i) => ({
      nombre: i.nombre,
      email: i.email,
      tipo: i.tipo ?? "externo",
      cargo: i.cargo ?? null,
      solicitarAprobacionCorreo: i.solicitarAprobacionCorreo ?? true,
    })),
    clientesIds: clientesRows.map((r) => r.clienteId).sort((a, b) => a - b),
    actividadesIds: actividadesRows.map((r) => r.actividadId).sort((a, b) => a - b),
    compromisos: compromisosRows.map((c) => ({
      descripcion: c.descripcion,
      fechaLimite: toFechaStr(c.fechaLimite),
      actaIntegranteId: c.actaIntegranteId ?? null,
      clienteMiembroId: c.clienteMiembroId ?? null,
    })),
  };
}

/** Snapshot "despues" de una edición: mismo esquema que antes pero compromisos con asignado por índice/ClienteMiembro. */
export type SnapshotDespuesEdicionActa = Omit<SnapshotAuditoriaActa, "compromisos"> & {
  compromisos: { descripcion: string; fechaLimite: string | null; asignadoIndex: number | null; asignadoClienteMiembroId: number | null }[];
};

export function snapshotDespuesEdicion(
  fecha: string,
  objetivo: string,
  contenido: string | null,
  integrantes: z.infer<typeof integrantesSchema>,
  clientesIds: number[],
  actividadesIds: number[],
  compromisosForm: CompromisoFormItem[]
): SnapshotDespuesEdicionActa {
  return {
    fecha: fecha.slice(0, 10),
    objetivo,
    contenido,
    integrantes: integrantes.map((i) => ({
      nombre: i.nombre,
      email: i.email,
      tipo: i.tipo ?? "externo",
      cargo: (i.cargo?.trim() || null) ?? null,
      solicitarAprobacionCorreo: i.solicitarAprobacionCorreo ?? true,
    })),
    clientesIds: [...clientesIds].sort((a, b) => a - b),
    actividadesIds: [...actividadesIds].sort((a, b) => a - b),
    compromisos: compromisosForm.map((c) => ({
      descripcion: c.descripcion,
      fechaLimite: (c.fechaLimite?.trim() || null) ?? null,
      asignadoIndex: c.asignadoIndex ?? null,
      asignadoClienteMiembroId: c.asignadoClienteMiembroId ?? null,
    })),
  };
}
