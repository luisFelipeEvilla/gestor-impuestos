"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  compromisosActa,
  compromisosActaHistorial,
  documentosCompromisoActa,
  actasReunion,
  actasIntegrantes,
  clientesMiembros,
  actasReunionClientes,
  clientes,
  usuarios,
} from "@/lib/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import {
  saveCompromisoDocument,
  getCompromisoRelativePath,
  isAllowedMime,
  isAllowedSize,
} from "@/lib/uploads";

export type CompromisoGestionItem = {
  id: number;
  descripcion: string;
  fechaLimite: Date | null;
  estado: "pendiente" | "cumplido" | "no_cumplido";
  detalleActualizacion: string | null;
  actualizadoEn: Date | null;
  actualizadoPorNombre: string | null;
  actaId: string;
  actaFecha: Date;
  actaObjetivo: string;
  asignadoNombre: string | null;
  /** 'interno' si está asignado a acta_integrante (nuestra empresa), 'cliente' si a cliente_miembro. */
  asignadoTipo: "interno" | "cliente" | null;
  clientesNombres: string[];
};

export type FiltrosCompromisos = {
  clienteId?: number;
  /** "u-{userId}" para miembro interno, "m-{clienteMiembroId}" para miembro del cliente. */
  miembro?: string;
};

export async function obtenerCompromisosParaGestion(
  filtros?: FiltrosCompromisos
): Promise<CompromisoGestionItem[]> {
  const base = db
    .select({
      id: compromisosActa.id,
      descripcion: compromisosActa.descripcion,
      fechaLimite: compromisosActa.fechaLimite,
      estado: compromisosActa.estado,
      detalleActualizacion: compromisosActa.detalleActualizacion,
      actualizadoEn: compromisosActa.actualizadoEn,
      actaId: compromisosActa.actaId,
      actaFecha: actasReunion.fecha,
      actaObjetivo: actasReunion.objetivo,
      nombreIntegrante: actasIntegrantes.nombre,
      nombreClienteMiembro: clientesMiembros.nombre,
      actaIntegranteId: compromisosActa.actaIntegranteId,
      clienteMiembroId: compromisosActa.clienteMiembroId,
      actualizadoPorNombre: usuarios.nombre,
    })
    .from(compromisosActa)
    .innerJoin(actasReunion, eq(compromisosActa.actaId, actasReunion.id))
    .leftJoin(actasIntegrantes, eq(compromisosActa.actaIntegranteId, actasIntegrantes.id))
    .leftJoin(clientesMiembros, eq(compromisosActa.clienteMiembroId, clientesMiembros.id))
    .leftJoin(usuarios, eq(compromisosActa.actualizadoPorId, usuarios.id));

  const condiciones: Parameters<typeof and>[0][] = [];

  if (filtros?.clienteId != null) {
    const actasDelCliente = await db
      .select({ actaId: actasReunionClientes.actaId })
      .from(actasReunionClientes)
      .where(eq(actasReunionClientes.clienteId, filtros.clienteId));
    const actaIds = actasDelCliente.map((r) => r.actaId);
    if (actaIds.length === 0) return [];
    condiciones.push(inArray(compromisosActa.actaId, actaIds));
  }

  if (filtros?.miembro?.startsWith("u-")) {
    const userId = parseInt(filtros.miembro.slice(2), 10);
    if (!Number.isNaN(userId)) {
      const integrantesDelUsuario = await db
        .select({ id: actasIntegrantes.id })
        .from(actasIntegrantes)
        .where(eq(actasIntegrantes.usuarioId, userId));
      const ids = integrantesDelUsuario.map((r) => r.id);
      if (ids.length === 0) return [];
      condiciones.push(inArray(compromisosActa.actaIntegranteId, ids));
    }
  } else if (filtros?.miembro?.startsWith("m-")) {
    const clienteMiembroId = parseInt(filtros.miembro.slice(2), 10);
    if (!Number.isNaN(clienteMiembroId)) {
      condiciones.push(eq(compromisosActa.clienteMiembroId, clienteMiembroId));
    }
  }

  const rows =
    condiciones.length > 0
      ? await base.where(and(...condiciones)).orderBy(actasReunion.fecha, compromisosActa.id)
      : await base.orderBy(actasReunion.fecha, compromisosActa.id);

  const actaIdsUnicos = [...new Set(rows.map((r) => r.actaId))];
  const clientesPorActa: Record<number, string[]> = {};
  for (const aid of actaIdsUnicos) {
    const clientesRows = await db
      .select({ nombre: clientes.nombre })
      .from(actasReunionClientes)
      .innerJoin(clientes, eq(actasReunionClientes.clienteId, clientes.id))
      .where(eq(actasReunionClientes.actaId, aid));
    clientesPorActa[aid] = clientesRows.map((c) => c.nombre);
  }

  return rows.map((r) => ({
    id: r.id,
    descripcion: r.descripcion,
    fechaLimite: r.fechaLimite as Date | null,
    estado: (r.estado ?? "pendiente") as "pendiente" | "cumplido" | "no_cumplido",
    detalleActualizacion: r.detalleActualizacion ?? null,
    actualizadoEn: r.actualizadoEn as Date | null,
    actualizadoPorNombre: r.actualizadoPorNombre ?? null,
    actaId: r.actaId,
    actaFecha: new Date(r.actaFecha),
    actaObjetivo: r.actaObjetivo,
    asignadoNombre: r.nombreIntegrante ?? r.nombreClienteMiembro ?? null,
    asignadoTipo: r.actaIntegranteId != null ? "interno" : r.clienteMiembroId != null ? "cliente" : null,
    clientesNombres: clientesPorActa[r.actaId] ?? [],
  }));
}

export type OpcionMiembroFiltro = {
  value: string;
  label: string;
  group: "interno" | "cliente";
};

/** Opciones para el filtro por miembro: usuarios (internos) y clientes_miembros con nombre del cliente. */
export async function obtenerOpcionesMiembroParaFiltro(): Promise<OpcionMiembroFiltro[]> {
  const [usuariosRows, miembrosRows] = await Promise.all([
    db
      .select({ id: usuarios.id, nombre: usuarios.nombre })
      .from(usuarios)
      .where(eq(usuarios.activo, true))
      .orderBy(usuarios.nombre),
    db
      .select({
        id: clientesMiembros.id,
        nombre: clientesMiembros.nombre,
        nombreCliente: clientes.nombre,
      })
      .from(clientesMiembros)
      .innerJoin(clientes, eq(clientesMiembros.clienteId, clientes.id))
      .where(eq(clientesMiembros.activo, true))
      .orderBy(clientes.nombre, clientesMiembros.nombre),
  ]);
  const opciones: OpcionMiembroFiltro[] = [];
  usuariosRows.forEach((u) => {
    opciones.push({ value: `u-${u.id}`, label: `${u.nombre} (interno)`, group: "interno" });
  });
  miembrosRows.forEach((m) => {
    opciones.push({
      value: `m-${m.id}`,
      label: `${m.nombre} (${m.nombreCliente})`,
      group: "cliente",
    });
  });
  return opciones;
}

export async function actualizarEstadoCompromiso(
  compromisoId: number,
  estado: "pendiente" | "cumplido" | "no_cumplido",
  detalle: string
): Promise<{ error?: string; historialId?: number }> {
  const session = await getSession();
  if (!session?.user) return { error: "Debes iniciar sesión." };
  if (!Number.isInteger(compromisoId) || compromisoId < 1) return { error: "Compromiso inválido." };

  try {
    const [compromiso] = await db
      .select({
        actaId: compromisosActa.actaId,
        estadoAnterior: compromisosActa.estado,
      })
      .from(compromisosActa)
      .where(eq(compromisosActa.id, compromisoId));
    if (!compromiso) return { error: "Compromiso no encontrado." };

    const [insertedHistorial] = await db
      .insert(compromisosActaHistorial)
      .values({
        compromisoActaId: compromisoId,
        estadoAnterior: compromiso.estadoAnterior,
        estadoNuevo: estado,
        detalle: detalle.trim() || null,
        creadoPorId: session.user.id,
      })
      .returning({ id: compromisosActaHistorial.id });

    await db
      .update(compromisosActa)
      .set({
        estado,
        detalleActualizacion: detalle.trim() || null,
        actualizadoEn: new Date(),
        actualizadoPorId: session.user.id,
      })
      .where(eq(compromisosActa.id, compromisoId));

    revalidatePath("/actas");
    revalidatePath("/actas/compromisos");
    revalidatePath(`/actas/${compromiso.actaId}`);
    revalidatePath(`/actas/compromisos/${compromisoId}`);
    return { historialId: insertedHistorial?.id };
  } catch (err) {
    console.error(err);
    return { error: "Error al actualizar el compromiso." };
  }
}

export type EstadoFormEstadoCompromiso = { error?: string } | null;

export async function actualizarEstadoCompromisoAction(
  formData: FormData
): Promise<EstadoFormEstadoCompromiso> {
  const compromisoId = Number(formData.get("compromisoId"));
  const estado = formData.get("estado") as string;
  const detalle = (formData.get("detalle") as string) ?? "";
  const estadosValidos = ["pendiente", "cumplido", "no_cumplido"] as const;
  if (
    !Number.isInteger(compromisoId) ||
    compromisoId < 1 ||
    !estadosValidos.includes(estado as (typeof estadosValidos)[number])
  ) {
    return { error: "Datos inválidos." };
  }
  const result = await actualizarEstadoCompromiso(
    compromisoId,
    estado as (typeof estadosValidos)[number],
    detalle
  );
  if (result.error) return result;
  const historialId = result.historialId;
  if (!historialId) return {};

  const archivos = formData.getAll("archivos") as File[];
  const files = Array.isArray(archivos) ? archivos : [archivos].filter(Boolean);
  for (const file of files) {
    if (!file || typeof file.size !== "number" || file.size === 0) continue;
    if (!isAllowedSize(file.size)) continue;
    if (!isAllowedMime(file.type)) continue;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const storedFileName = await saveCompromisoDocument(
        compromisoId,
        buffer,
        file.name,
        file.type
      );
      const rutaArchivo = getCompromisoRelativePath(compromisoId, storedFileName);
      await db.insert(documentosCompromisoActa).values({
        compromisoActaHistorialId: historialId,
        nombreOriginal: file.name,
        rutaArchivo,
        mimeType: file.type,
        tamano: file.size,
      });
    } catch (err) {
      console.error("Error al adjuntar documento al compromiso:", err);
    }
  }
  return {};
}

export type CompromisoDetalleItem = {
  id: number;
  descripcion: string;
  fechaLimite: Date | null;
  estado: "pendiente" | "cumplido" | "no_cumplido";
  detalleActualizacion: string | null;
  actualizadoEn: Date | null;
  actualizadoPorNombre: string | null;
  actaId: string;
  actaFecha: Date;
  actaObjetivo: string;
  asignadoNombre: string | null;
  asignadoTipo: "interno" | "cliente" | null;
  clientesNombres: string[];
};

export type DocumentoCompromisoItem = {
  id: number;
  nombreOriginal: string;
  mimeType: string;
  tamano: number;
  creadoEn: Date;
};

export type CompromisoHistorialItem = {
  id: number;
  estadoAnterior: "pendiente" | "cumplido" | "no_cumplido" | null;
  estadoNuevo: "pendiente" | "cumplido" | "no_cumplido";
  detalle: string | null;
  creadoEn: Date;
  creadoPorNombre: string | null;
  documentos: DocumentoCompromisoItem[];
};

export type CompromisoConHistorial = {
  compromiso: CompromisoDetalleItem;
  historial: CompromisoHistorialItem[];
};

/** Obtiene un compromiso por ID con su acta, asignado, clientes y historial de actualizaciones. */
export async function obtenerCompromisoPorIdConHistorial(
  compromisoId: number
): Promise<CompromisoConHistorial | null> {
  if (!Number.isInteger(compromisoId) || compromisoId < 1) return null;

  const [row] = await db
    .select({
      id: compromisosActa.id,
      descripcion: compromisosActa.descripcion,
      fechaLimite: compromisosActa.fechaLimite,
      estado: compromisosActa.estado,
      detalleActualizacion: compromisosActa.detalleActualizacion,
      actualizadoEn: compromisosActa.actualizadoEn,
      actaId: compromisosActa.actaId,
      actaFecha: actasReunion.fecha,
      actaObjetivo: actasReunion.objetivo,
      nombreIntegrante: actasIntegrantes.nombre,
      nombreClienteMiembro: clientesMiembros.nombre,
      actaIntegranteId: compromisosActa.actaIntegranteId,
      clienteMiembroId: compromisosActa.clienteMiembroId,
      actualizadoPorNombre: usuarios.nombre,
    })
    .from(compromisosActa)
    .innerJoin(actasReunion, eq(compromisosActa.actaId, actasReunion.id))
    .leftJoin(actasIntegrantes, eq(compromisosActa.actaIntegranteId, actasIntegrantes.id))
    .leftJoin(clientesMiembros, eq(compromisosActa.clienteMiembroId, clientesMiembros.id))
    .leftJoin(usuarios, eq(compromisosActa.actualizadoPorId, usuarios.id))
    .where(eq(compromisosActa.id, compromisoId));

  if (!row) return null;

  const clientesRows = await db
    .select({ nombre: clientes.nombre })
    .from(actasReunionClientes)
    .innerJoin(clientes, eq(actasReunionClientes.clienteId, clientes.id))
    .where(eq(actasReunionClientes.actaId, row.actaId));
  const clientesNombres = clientesRows.map((c) => c.nombre);

  const historialRows = await db
    .select({
      id: compromisosActaHistorial.id,
      estadoAnterior: compromisosActaHistorial.estadoAnterior,
      estadoNuevo: compromisosActaHistorial.estadoNuevo,
      detalle: compromisosActaHistorial.detalle,
      creadoEn: compromisosActaHistorial.creadoEn,
      creadoPorNombre: usuarios.nombre,
    })
    .from(compromisosActaHistorial)
    .leftJoin(usuarios, eq(compromisosActaHistorial.creadoPorId, usuarios.id))
    .where(eq(compromisosActaHistorial.compromisoActaId, compromisoId))
    .orderBy(desc(compromisosActaHistorial.creadoEn));

  const historialIds = historialRows.map((h) => h.id);
  const documentosRows =
    historialIds.length > 0
      ? await db
          .select({
            id: documentosCompromisoActa.id,
            compromisoActaHistorialId: documentosCompromisoActa.compromisoActaHistorialId,
            nombreOriginal: documentosCompromisoActa.nombreOriginal,
            mimeType: documentosCompromisoActa.mimeType,
            tamano: documentosCompromisoActa.tamano,
            creadoEn: documentosCompromisoActa.creadoEn,
          })
          .from(documentosCompromisoActa)
          .where(inArray(documentosCompromisoActa.compromisoActaHistorialId, historialIds))
      : [];
  const documentosPorHistorial = historialIds.reduce(
    (acc, hid) => {
      acc[hid] = documentosRows
        .filter((d) => d.compromisoActaHistorialId === hid)
        .map((d) => ({
          id: d.id,
          nombreOriginal: d.nombreOriginal,
          mimeType: d.mimeType,
          tamano: d.tamano,
          creadoEn: d.creadoEn as Date,
        }));
      return acc;
    },
    {} as Record<number, DocumentoCompromisoItem[]>
  );

  return {
    compromiso: {
      id: row.id,
      descripcion: row.descripcion,
      fechaLimite: row.fechaLimite as Date | null,
      estado: (row.estado ?? "pendiente") as "pendiente" | "cumplido" | "no_cumplido",
      detalleActualizacion: row.detalleActualizacion ?? null,
      actualizadoEn: row.actualizadoEn as Date | null,
      actualizadoPorNombre: row.actualizadoPorNombre ?? null,
      actaId: row.actaId,
      actaFecha: new Date(row.actaFecha),
      actaObjetivo: row.actaObjetivo,
      asignadoNombre: row.nombreIntegrante ?? row.nombreClienteMiembro ?? null,
      asignadoTipo:
        row.actaIntegranteId != null ? "interno" : row.clienteMiembroId != null ? "cliente" : null,
      clientesNombres,
    },
    historial: historialRows.map((h) => ({
      id: h.id,
      estadoAnterior: h.estadoAnterior as "pendiente" | "cumplido" | "no_cumplido" | null,
      estadoNuevo: (h.estadoNuevo ?? "pendiente") as "pendiente" | "cumplido" | "no_cumplido",
      detalle: h.detalle ?? null,
      creadoEn: h.creadoEn as Date,
      creadoPorNombre: h.creadoPorNombre ?? null,
      documentos: documentosPorHistorial[h.id] ?? [],
    })),
  };
}
