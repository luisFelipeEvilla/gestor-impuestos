"use server";

import { db } from "@/lib/db";
import {
  actasReunion,
  actasIntegrantes,
  actasReunionClientes,
  actasReunionActividades,
  actividades,
  compromisosActa,
  clientesMiembros,
  historialActa,
  aprobacionesActaParticipante,
  usuarios,
  documentosActa,
  clientes,
} from "@/lib/db/schema";
import { eq, and, or, desc, gte, lte, inArray, count } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import {
  estadoActaValues,
  type CompromisoDetalle,
  type ActaDetalle,
  type HistorialActaItem,
  type ActaListItem,
  type AprobacionParticipanteItem,
} from "@/lib/actions/actas-types";

const ACTAS_PAGE_SIZE = 15;

export async function obtenerActas(filtros?: {
  estado?: (typeof estadoActaValues)[number];
  fechaDesde?: string;
  fechaHasta?: string;
  clienteId?: number;
  creadoPorId?: number;
  integranteUsuarioIds?: number[];
  integranteExternoEmails?: string[];
  page?: number;
  pageSize?: number;
}): Promise<{
  actas: ActaListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const session = await getSession();
  if (!session?.user) {
    return { actas: [], total: 0, page: 1, pageSize: ACTAS_PAGE_SIZE, totalPages: 0 };
  }

  const conditions = [];
  if (filtros?.estado) {
    conditions.push(eq(actasReunion.estado, filtros.estado));
  }
  if (filtros?.fechaDesde) {
    conditions.push(gte(actasReunion.fecha, filtros.fechaDesde));
  }
  if (filtros?.fechaHasta) {
    conditions.push(lte(actasReunion.fecha, filtros.fechaHasta));
  }
  if (filtros?.creadoPorId != null && filtros.creadoPorId > 0) {
    conditions.push(eq(actasReunion.creadoPorId, filtros.creadoPorId));
  }

  if (filtros?.clienteId != null && filtros.clienteId > 0) {
    const actaIdsConCliente = await db
      .selectDistinct({ actaId: actasReunionClientes.actaId })
      .from(actasReunionClientes)
      .where(eq(actasReunionClientes.clienteId, filtros.clienteId));
    const ids = actaIdsConCliente.map((r) => r.actaId);
    if (ids.length === 0) {
      return { actas: [], total: 0, page: 1, pageSize: ACTAS_PAGE_SIZE, totalPages: 0 };
    }
    conditions.push(inArray(actasReunion.id, ids));
  }

  if (filtros?.integranteUsuarioIds?.length) {
    const idsSet = new Set<string>();
    for (const usuarioId of filtros.integranteUsuarioIds) {
      if (!Number.isInteger(usuarioId) || usuarioId <= 0) continue;
      const rows = await db
        .selectDistinct({ actaId: actasIntegrantes.actaId })
        .from(actasIntegrantes)
        .where(eq(actasIntegrantes.usuarioId, usuarioId));
      rows.forEach((r) => idsSet.add(r.actaId));
    }
    const ids = Array.from(idsSet);
    if (ids.length === 0) {
      return { actas: [], total: 0, page: 1, pageSize: ACTAS_PAGE_SIZE, totalPages: 0 };
    }
    conditions.push(inArray(actasReunion.id, ids));
  }

  if (filtros?.integranteExternoEmails?.length) {
    const emails = filtros.integranteExternoEmails.filter((e) => e?.trim());
    if (emails.length > 0) {
      const idsSet = new Set<string>();
      for (const email of emails) {
        const rows = await db
          .selectDistinct({ actaId: actasIntegrantes.actaId })
          .from(actasIntegrantes)
          .where(
            and(
              eq(actasIntegrantes.tipo, "externo"),
              eq(actasIntegrantes.email, email.trim())
            )
          );
        rows.forEach((r) => idsSet.add(r.actaId));
      }
      const ids = Array.from(idsSet);
      if (ids.length === 0) {
        return { actas: [], total: 0, page: 1, pageSize: ACTAS_PAGE_SIZE, totalPages: 0 };
      }
      conditions.push(inArray(actasReunion.id, ids));
    }
  }

  if (session.user.rol !== "admin") {
    // Los empleados pueden ver:
    // 1. Actas donde participan como integrantes
    // 2. Actas que ellos mismos crearon
    const actasDondeParticipa = await db
      .selectDistinct({ actaId: actasIntegrantes.actaId })
      .from(actasIntegrantes)
      .where(eq(actasIntegrantes.usuarioId, session.user.id));
    const actaIdsParticipacion = actasDondeParticipa.map((r) => r.actaId);
    
    // Combinar actas donde participa y actas que creó
    const condicionesEmpleado: ReturnType<typeof inArray | typeof eq>[] = [];
    
    // Incluir actas donde participa como integrante
    if (actaIdsParticipacion.length > 0) {
      condicionesEmpleado.push(inArray(actasReunion.id, actaIdsParticipacion));
    }
    
    // Siempre incluir las actas que creó
    condicionesEmpleado.push(eq(actasReunion.creadoPorId, session.user.id));
    
    // Usar OR para incluir actas donde participa O actas que creó
    // Si solo hay una condición, usarla directamente; si hay más, usar OR
    if (condicionesEmpleado.length === 1) {
      conditions.push(condicionesEmpleado[0]);
    } else {
      conditions.push(or(...condicionesEmpleado)!);
    }
  }

  const whereCond = conditions.length > 0 ? and(...conditions) : undefined;
  const page = Math.max(1, filtros?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filtros?.pageSize ?? ACTAS_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const [countResult, list] = await Promise.all([
    db
      .select({ total: count(actasReunion.id) })
      .from(actasReunion)
      .where(whereCond),
    db
      .select({
        id: actasReunion.id,
        serial: actasReunion.serial,
        fecha: actasReunion.fecha,
        objetivo: actasReunion.objetivo,
        estado: actasReunion.estado,
        creadorNombre: usuarios.nombre,
      })
      .from(actasReunion)
      .leftJoin(usuarios, eq(actasReunion.creadoPorId, usuarios.id))
      .where(whereCond)
      .orderBy(desc(actasReunion.creadoEn))
      .limit(pageSize)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.total ?? 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  const integrantesRows = await db
    .select({ actaId: actasIntegrantes.actaId })
    .from(actasIntegrantes);
  const countByActa = new Map<string, number>();
  for (const r of integrantesRows) {
    countByActa.set(r.actaId, (countByActa.get(r.actaId) ?? 0) + 1);
  }

  const actas = list.map((row) => ({
    id: row.id,
    serial: row.serial,
    fecha: row.fecha as unknown as Date,
    objetivo: row.objetivo,
    estado: row.estado as (typeof estadoActaValues)[number],
    creadorNombre: row.creadorNombre,
    numIntegrantes: countByActa.get(row.id) ?? 0,
  }));

  return { actas, total, page, pageSize, totalPages };
}

export async function obtenerUsuariosParaFiltroActas(): Promise<
  { id: number; nombre: string }[]
> {
  const session = await getSession();
  if (!session?.user) return [];
  const rows = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre })
    .from(usuarios)
    .where(eq(usuarios.activo, true))
    .orderBy(usuarios.nombre);
  return rows;
}

export async function obtenerAsistentesExternosParaFiltro(clienteId?: number): Promise<
  { email: string; nombre: string }[]
> {
  const session = await getSession();
  if (!session?.user) return [];
  if (clienteId != null && clienteId > 0) {
    const actaIdsDelCliente = await db
      .selectDistinct({ actaId: actasReunionClientes.actaId })
      .from(actasReunionClientes)
      .where(eq(actasReunionClientes.clienteId, clienteId));
    const ids = actaIdsDelCliente.map((r) => r.actaId);
    if (ids.length === 0) return [];
    const rows = await db
      .selectDistinct({
        email: actasIntegrantes.email,
        nombre: actasIntegrantes.nombre,
      })
      .from(actasIntegrantes)
      .where(
        and(
          eq(actasIntegrantes.tipo, "externo"),
          inArray(actasIntegrantes.actaId, ids)
        )
      )
      .orderBy(actasIntegrantes.email);
    return rows.map((r) => ({ email: r.email, nombre: r.nombre }));
  }
  const rows = await db
    .selectDistinct({
      email: actasIntegrantes.email,
      nombre: actasIntegrantes.nombre,
    })
    .from(actasIntegrantes)
    .where(eq(actasIntegrantes.tipo, "externo"))
    .orderBy(actasIntegrantes.email);
  return rows.map((r) => ({ email: r.email, nombre: r.nombre }));
}

export async function obtenerActaParaPreviewParticipante(
  actaId: string
): Promise<{
  id: string;
  fecha: Date;
  objetivo: string;
  contenido: string | null;
  compromisos: string | null;
  compromisosLista: CompromisoDetalle[];
  documentos: { id: number; nombreOriginal: string; mimeType: string; tamano: number; creadoEn: Date }[];
  actividades: { id: number; codigo: string; descripcion: string }[];
} | null> {
  if (!actaId || typeof actaId !== "string") return null;
  const [acta] = await db
    .select({
      id: actasReunion.id,
      fecha: actasReunion.fecha,
      objetivo: actasReunion.objetivo,
      contenido: actasReunion.contenido,
      compromisos: actasReunion.compromisos,
      estado: actasReunion.estado,
    })
    .from(actasReunion)
    .where(eq(actasReunion.id, actaId));
  if (!acta || acta.estado !== "enviada") return null;
  const [documentosRows, compromisosRows, actividadesRows] = await Promise.all([
    db
      .select({
        id: documentosActa.id,
        nombreOriginal: documentosActa.nombreOriginal,
        mimeType: documentosActa.mimeType,
        tamano: documentosActa.tamano,
        creadoEn: documentosActa.creadoEn,
      })
      .from(documentosActa)
      .where(eq(documentosActa.actaId, actaId)),
    db
      .select({
        id: compromisosActa.id,
        descripcion: compromisosActa.descripcion,
        fechaLimite: compromisosActa.fechaLimite,
        nombreIntegrante: actasIntegrantes.nombre,
        cargoIntegrante: actasIntegrantes.cargo,
        nombreClienteMiembro: clientesMiembros.nombre,
        cargoClienteMiembro: clientesMiembros.cargo,
        estado: compromisosActa.estado,
        detalleActualizacion: compromisosActa.detalleActualizacion,
        actualizadoEn: compromisosActa.actualizadoEn,
      })
      .from(compromisosActa)
      .leftJoin(actasIntegrantes, eq(compromisosActa.actaIntegranteId, actasIntegrantes.id))
      .leftJoin(clientesMiembros, eq(compromisosActa.clienteMiembroId, clientesMiembros.id))
      .where(eq(compromisosActa.actaId, actaId)),
    db
      .select({
        id: actividades.id,
        codigo: actividades.codigo,
        descripcion: actividades.descripcion,
      })
      .from(actasReunionActividades)
      .innerJoin(actividades, eq(actasReunionActividades.actividadId, actividades.id))
      .where(eq(actasReunionActividades.actaId, actaId)),
  ]);
  return {
    id: acta.id,
    fecha: acta.fecha as unknown as Date,
    objetivo: acta.objetivo,
    contenido: acta.contenido,
    compromisos: acta.compromisos,
    compromisosLista: compromisosRows.map((c) => ({
      id: c.id,
      descripcion: c.descripcion,
      fechaLimite: c.fechaLimite as Date | null,
      asignadoNombre: c.nombreIntegrante ?? c.nombreClienteMiembro ?? null,
      asignadoCargo: c.cargoIntegrante ?? c.cargoClienteMiembro ?? null,
      estado: (c.estado ?? "pendiente") as "pendiente" | "cumplido" | "no_cumplido",
      detalleActualizacion: c.detalleActualizacion ?? null,
      actualizadoEn: c.actualizadoEn as Date | null,
    })),
    documentos: documentosRows.map((d) => ({
      id: d.id,
      nombreOriginal: d.nombreOriginal,
      mimeType: d.mimeType,
      tamano: d.tamano,
      creadoEn: d.creadoEn,
    })),
    actividades: actividadesRows.map((a) => ({ id: a.id, codigo: a.codigo, descripcion: a.descripcion })),
  };
}

export async function obtenerActaPorId(actaId: string): Promise<ActaDetalle | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const [acta] = await db
    .select({
      id: actasReunion.id,
      serial: actasReunion.serial,
      fecha: actasReunion.fecha,
      objetivo: actasReunion.objetivo,
      contenido: actasReunion.contenido,
      compromisos: actasReunion.compromisos,
      estado: actasReunion.estado,
      creadoPorId: actasReunion.creadoPorId,
      aprobadoPorId: actasReunion.aprobadoPorId,
      creadoEn: actasReunion.creadoEn,
      actualizadoEn: actasReunion.actualizadoEn,
      creadorNombre: usuarios.nombre,
    })
    .from(actasReunion)
    .leftJoin(usuarios, eq(actasReunion.creadoPorId, usuarios.id))
    .where(eq(actasReunion.id, actaId));

  if (!acta) return null;

  if (session.user.rol !== "admin") {
    // Los empleados pueden ver actas donde participan como integrantes
    // o actas que ellos mismos crearon
    const esCreador = acta.creadoPorId === session.user.id;
    if (!esCreador) {
      const [participa] = await db
        .select({ id: actasIntegrantes.id })
        .from(actasIntegrantes)
        .where(
          and(
            eq(actasIntegrantes.actaId, actaId),
            eq(actasIntegrantes.usuarioId, session.user.id)
          )
        );
      if (!participa) return null;
    }
  }

  let aprobadoPorNombre: string | null = null;
  if (acta.aprobadoPorId) {
    const [aprobador] = await db
      .select({ nombre: usuarios.nombre })
      .from(usuarios)
      .where(eq(usuarios.id, acta.aprobadoPorId))
      .limit(1);
    aprobadoPorNombre = aprobador?.nombre ?? null;
  }

  const [integrantesRows, documentosRows, compromisosRows, clientesRows, actividadesRows] = await Promise.all([
    db
      .select({
        id: actasIntegrantes.id,
        nombre: actasIntegrantes.nombre,
        email: actasIntegrantes.email,
        usuarioId: actasIntegrantes.usuarioId,
        tipo: actasIntegrantes.tipo,
        cargo: actasIntegrantes.cargo,
        solicitarAprobacionCorreo: actasIntegrantes.solicitarAprobacionCorreo,
      })
      .from(actasIntegrantes)
      .where(eq(actasIntegrantes.actaId, actaId)),
    db
      .select({
        id: documentosActa.id,
        nombreOriginal: documentosActa.nombreOriginal,
        mimeType: documentosActa.mimeType,
        tamano: documentosActa.tamano,
        creadoEn: documentosActa.creadoEn,
      })
      .from(documentosActa)
      .where(eq(documentosActa.actaId, actaId)),
    db
      .select({
        id: compromisosActa.id,
        descripcion: compromisosActa.descripcion,
        fechaLimite: compromisosActa.fechaLimite,
        nombreIntegrante: actasIntegrantes.nombre,
        cargoIntegrante: actasIntegrantes.cargo,
        nombreClienteMiembro: clientesMiembros.nombre,
        cargoClienteMiembro: clientesMiembros.cargo,
        estado: compromisosActa.estado,
        detalleActualizacion: compromisosActa.detalleActualizacion,
        actualizadoEn: compromisosActa.actualizadoEn,
      })
      .from(compromisosActa)
      .leftJoin(actasIntegrantes, eq(compromisosActa.actaIntegranteId, actasIntegrantes.id))
      .leftJoin(clientesMiembros, eq(compromisosActa.clienteMiembroId, clientesMiembros.id))
      .where(eq(compromisosActa.actaId, actaId)),
    db
      .select({
        id: clientes.id,
        nombre: clientes.nombre,
        codigo: clientes.codigo,
      })
      .from(actasReunionClientes)
      .innerJoin(clientes, eq(actasReunionClientes.clienteId, clientes.id))
      .where(eq(actasReunionClientes.actaId, actaId)),
    db
      .select({
        id: actividades.id,
        codigo: actividades.codigo,
        descripcion: actividades.descripcion,
      })
      .from(actasReunionActividades)
      .innerJoin(actividades, eq(actasReunionActividades.actividadId, actividades.id))
      .where(eq(actasReunionActividades.actaId, actaId)),
  ]);

  return {
    id: acta.id,
    serial: acta.serial,
    fecha: acta.fecha as unknown as Date,
    objetivo: acta.objetivo,
    contenido: acta.contenido,
    compromisos: acta.compromisos,
    compromisosLista: compromisosRows.map((c) => ({
      id: c.id,
      descripcion: c.descripcion,
      fechaLimite: c.fechaLimite as Date | null,
      asignadoNombre: c.nombreIntegrante ?? c.nombreClienteMiembro ?? null,
      asignadoCargo: c.cargoIntegrante ?? c.cargoClienteMiembro ?? null,
      estado: (c.estado ?? "pendiente") as "pendiente" | "cumplido" | "no_cumplido",
      detalleActualizacion: c.detalleActualizacion ?? null,
      actualizadoEn: c.actualizadoEn as Date | null,
    })),
    estado: acta.estado as (typeof estadoActaValues)[number],
    creadoPorId: acta.creadoPorId,
    creadorNombre: acta.creadorNombre,
    aprobadoPorId: acta.aprobadoPorId,
    aprobadoPorNombre,
    creadoEn: acta.creadoEn,
    actualizadoEn: acta.actualizadoEn,
    clientes: clientesRows.map((c) => ({ id: c.id, nombre: c.nombre, codigo: c.codigo })),
    integrantes: integrantesRows.map((i) => ({
      id: i.id,
      nombre: i.nombre,
      email: i.email,
      usuarioId: i.usuarioId,
      tipo: (i.tipo ?? "externo") as "interno" | "externo",
      cargo: i.cargo,
      solicitarAprobacionCorreo: i.solicitarAprobacionCorreo ?? true,
    })),
    documentos: documentosRows.map((d) => ({
      id: d.id,
      nombreOriginal: d.nombreOriginal,
      mimeType: d.mimeType,
      tamano: d.tamano,
      creadoEn: d.creadoEn,
    })),
    actividades: actividadesRows.map((a) => ({ id: a.id, codigo: a.codigo, descripcion: a.descripcion })),
  };
}

export async function obtenerHistorialActa(actaId: string): Promise<HistorialActaItem[]> {
  const session = await getSession();
  if (!session?.user) return [];

  const rows = await db
    .select({
      id: historialActa.id,
      fecha: historialActa.fecha,
      tipoEvento: historialActa.tipoEvento,
      metadata: historialActa.metadata,
      usuarioNombre: usuarios.nombre,
    })
    .from(historialActa)
    .leftJoin(usuarios, eq(historialActa.usuarioId, usuarios.id))
    .where(eq(historialActa.actaId, actaId))
    .orderBy(desc(historialActa.fecha));

  return rows.map((r) => ({
    id: r.id,
    fecha: r.fecha,
    tipoEvento: r.tipoEvento,
    usuarioNombre: r.usuarioNombre,
    metadata: r.metadata ?? undefined,
  }));
}

export async function validarEnlaceAprobacionParticipante(
  actaId: string,
  integranteId: number,
  firma: string
): Promise<{ valido: boolean; error?: string }> {
  const { verificarFirmaAprobacion } = await import("@/lib/actas-aprobacion");
  if (!actaId || typeof actaId !== "string" || !Number.isInteger(integranteId) || integranteId < 1) {
    return { valido: false, error: "Enlace inválido." };
  }
  if (!verificarFirmaAprobacion(actaId, integranteId, firma)) {
    return { valido: false, error: "Enlace inválido o expirado." };
  }
  const [acta] = await db
    .select({ estado: actasReunion.estado })
    .from(actasReunion)
    .where(eq(actasReunion.id, actaId));
  if (!acta || acta.estado !== "enviada") {
    return { valido: false, error: "Enlace inválido o expirado." };
  }
  const [integrante] = await db
    .select({ id: actasIntegrantes.id })
    .from(actasIntegrantes)
    .where(
      and(
        eq(actasIntegrantes.actaId, actaId),
        eq(actasIntegrantes.id, integranteId)
      )
    );
  if (!integrante) {
    return { valido: false, error: "Enlace inválido o expirado." };
  }
  return { valido: true };
}

export async function yaAprobadoParticipante(
  actaId: string,
  integranteId: number
): Promise<boolean> {
  if (!actaId || typeof actaId !== "string" || !Number.isInteger(integranteId) || integranteId < 1) {
    return false;
  }
  const [row] = await db
    .select({ id: aprobacionesActaParticipante.id })
    .from(aprobacionesActaParticipante)
    .where(
      and(
        eq(aprobacionesActaParticipante.actaId, actaId),
        eq(aprobacionesActaParticipante.actaIntegranteId, integranteId)
      )
    );
  return !!row;
}

export async function obtenerRespuestaParticipante(
  actaId: string,
  integranteId: number
): Promise<{ respondido: boolean; rechazado?: boolean; motivoRechazo?: string | null }> {
  if (!actaId || typeof actaId !== "string" || !Number.isInteger(integranteId) || integranteId < 1) {
    return { respondido: false };
  }
  const [row] = await db
    .select({
      rechazado: aprobacionesActaParticipante.rechazado,
      motivoRechazo: aprobacionesActaParticipante.motivoRechazo,
    })
    .from(aprobacionesActaParticipante)
    .where(
      and(
        eq(aprobacionesActaParticipante.actaId, actaId),
        eq(aprobacionesActaParticipante.actaIntegranteId, integranteId)
      )
    );
  if (!row) return { respondido: false };
  return {
    respondido: true,
    rechazado: row.rechazado,
    motivoRechazo: row.motivoRechazo ?? null,
  };
}

export async function obtenerAprobacionesPorActa(
  actaId: string
): Promise<AprobacionParticipanteItem[]> {
  if (!actaId || typeof actaId !== "string") return [];
  const aprobaciones = await db
    .select({
      actaIntegranteId: actasIntegrantes.id,
      nombre: actasIntegrantes.nombre,
      email: actasIntegrantes.email,
      cargo: actasIntegrantes.cargo,
      aprobadoEn: aprobacionesActaParticipante.aprobadoEn,
      rutaFoto: aprobacionesActaParticipante.rutaFoto,
      rechazado: aprobacionesActaParticipante.rechazado,
      motivoRechazo: aprobacionesActaParticipante.motivoRechazo,
    })
    .from(actasIntegrantes)
    .leftJoin(
      aprobacionesActaParticipante,
      and(
        eq(aprobacionesActaParticipante.actaId, actasIntegrantes.actaId),
        eq(aprobacionesActaParticipante.actaIntegranteId, actasIntegrantes.id)
      )
    )
    .where(eq(actasIntegrantes.actaId, actaId));
  return aprobaciones.map((r) => ({
    actaIntegranteId: r.actaIntegranteId,
    nombre: r.nombre,
    email: r.email,
    cargo: r.cargo ?? null,
    aprobadoEn: r.aprobadoEn ?? null,
    rutaFoto: r.rutaFoto ?? null,
    rechazado: r.rechazado ?? false,
    motivoRechazo: r.motivoRechazo ?? null,
  }));
}
