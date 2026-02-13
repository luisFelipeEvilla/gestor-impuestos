"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  actasReunion,
  actasIntegrantes,
  actasReunionClientes,
  compromisosActa,
  clientesMiembros,
  historialActa,
  aprobacionesActaParticipante,
  usuarios,
  documentosActa,
  clientes,
} from "@/lib/db/schema";
import { generarFirmaAprobacion, verificarFirmaAprobacion } from "@/lib/actas-aprobacion";
import { eq, and, desc, gte, lte, inArray } from "drizzle-orm";
import { getSession, requireAdminSession } from "@/lib/auth-server";
import {
  estadoActaValues,
  compromisoFormSchema,
  type CompromisoFormItem,
  type ActaDetalle,
  type CompromisoDetalle,
  type EstadoFormActa,
  type EstadoGestionActa,
  type HistorialActaItem,
  type ActaListItem,
  type AprobacionParticipanteItem,
} from "@/lib/actions/actas-types";

const schemaCrear = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  objetivo: z.string().min(1, "El objetivo es obligatorio").max(2000),
  contenido: z.string().max(50000).optional().or(z.literal("")),
  compromisos: z.string().max(100000).optional().or(z.literal("")),
});

const schemaActualizar = schemaCrear.extend({
  id: z.number().int().positive(),
});

const tipoIntegranteValues = ["interno", "externo"] as const;

const integranteSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  usuarioId: z.number().int().positive().optional(),
  tipo: z.enum(tipoIntegranteValues).default("externo"),
  cargo: z.string().max(200).optional().or(z.literal("")),
  solicitarAprobacionCorreo: z.boolean().optional().default(true),
});

const integrantesSchema = z.array(integranteSchema);

function parseFecha(value: string | undefined): string | null {
  if (!value || value.trim() === "") return null;
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : value.trim().slice(0, 10);
}

function parseIntegrantes(value: unknown): z.infer<typeof integrantesSchema> {
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return integrantesSchema.parse(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

function parseClienteIds(value: unknown): number[] {
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is number => typeof x === "number" && Number.isInteger(x) && x > 0);
  } catch {
    return [];
  }
}

function parseCompromisos(value: unknown): CompromisoFormItem[] {
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const r = compromisoFormSchema.safeParse(item);
        return r.success ? r.data : null;
      })
      .filter((x): x is CompromisoFormItem => x !== null);
  } catch {
    return [];
  }
}

export async function obtenerActas(filtros?: {
  estado?: (typeof estadoActaValues)[number];
  fechaDesde?: string;
  fechaHasta?: string;
}): Promise<ActaListItem[]> {
  const session = await getSession();
  if (!session?.user) return [];

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

  if (session.user.rol !== "admin") {
    const actasDondeParticipa = await db
      .selectDistinct({ actaId: actasIntegrantes.actaId })
      .from(actasIntegrantes)
      .where(eq(actasIntegrantes.usuarioId, session.user.id));
    const actaIds = actasDondeParticipa.map((r) => r.actaId);
    if (actaIds.length === 0) {
      return [];
    }
    conditions.push(inArray(actasReunion.id, actaIds));
  }

  const list = await db
    .select({
      id: actasReunion.id,
      fecha: actasReunion.fecha,
      objetivo: actasReunion.objetivo,
      estado: actasReunion.estado,
      creadorNombre: usuarios.nombre,
    })
    .from(actasReunion)
    .leftJoin(usuarios, eq(actasReunion.creadoPorId, usuarios.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(actasReunion.creadoEn))
    .limit(100);

  const integrantesRows = await db
    .select({ actaId: actasIntegrantes.actaId })
    .from(actasIntegrantes);
  const countByActa = new Map<number, number>();
  for (const r of integrantesRows) {
    countByActa.set(r.actaId, (countByActa.get(r.actaId) ?? 0) + 1);
  }

  return list.map((row) => ({
    id: row.id,
    fecha: row.fecha as unknown as Date,
    objetivo: row.objetivo,
    estado: row.estado as (typeof estadoActaValues)[number],
    creadorNombre: row.creadorNombre,
    numIntegrantes: countByActa.get(row.id) ?? 0,
  }));
}

/**
 * Obtiene los datos del acta para la vista previa pública (participante con enlace firmado).
 * No requiere sesión. Solo devuelve datos si el acta está en estado "enviada".
 */
export async function obtenerActaParaPreviewParticipante(
  actaId: number
): Promise<{
  id: number;
  fecha: Date;
  objetivo: string;
  contenido: string | null;
  compromisos: string | null;
  compromisosLista: CompromisoDetalle[];
  documentos: { id: number; nombreOriginal: string; mimeType: string; tamano: number; creadoEn: Date }[];
} | null> {
  if (!Number.isInteger(actaId) || actaId < 1) return null;
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
  const [documentosRows, compromisosRows] = await Promise.all([
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
  };
}

export async function obtenerActaPorId(actaId: number): Promise<ActaDetalle | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const [acta] = await db
    .select({
      id: actasReunion.id,
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
    const [participa] = await db
      .select({ id: actasIntegrantes.id })
      .from(actasIntegrantes)
      .where(
        and(
          eq(actasIntegrantes.actaId, actaId),
          eq(actasIntegrantes.usuarioId, session.user.id)
        )
      );
    if (!participa) {
      return null;
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

  const integrantesRows = await db
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
    .where(eq(actasIntegrantes.actaId, actaId));

  const documentosRows = await db
    .select({
      id: documentosActa.id,
      nombreOriginal: documentosActa.nombreOriginal,
      mimeType: documentosActa.mimeType,
      tamano: documentosActa.tamano,
      creadoEn: documentosActa.creadoEn,
    })
    .from(documentosActa)
    .where(eq(documentosActa.actaId, actaId));

  const compromisosRows = await db
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
    .where(eq(compromisosActa.actaId, actaId));

  const clientesRows = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      codigo: clientes.codigo,
    })
    .from(actasReunionClientes)
    .innerJoin(clientes, eq(actasReunionClientes.clienteId, clientes.id))
    .where(eq(actasReunionClientes.actaId, actaId));

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
  };
}

export async function crearActa(
  _prev: EstadoFormActa | null,
  formData: FormData
): Promise<EstadoFormActa> {
  const session = await getSession();
  if (!session?.user) return { error: "Debes iniciar sesión." };

  const fechaStr = (formData.get("fecha") as string)?.trim();
  const objetivo = (formData.get("objetivo") as string)?.trim() ?? "";
  const contenido = (formData.get("contenido") as string)?.trim() || null;
  const compromisosRaw = formData.get("compromisos");
  const integrantesRaw = formData.get("integrantes");
  const clientesIdsRaw = formData.get("clientesIds");

  const parsed = schemaCrear.safeParse({
    fecha: fechaStr,
    objetivo,
    contenido: contenido ?? "",
    compromisos: typeof compromisosRaw === "string" ? compromisosRaw : "",
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const errores = flat.fieldErrors as Record<string, string[] | undefined>;
    return {
      error: flat.formErrors.join(" ") || "Datos inválidos",
      errores: Object.keys(errores).length ? (errores as Record<string, string[]>) : undefined,
    };
  }

  const fecha = parseFecha(parsed.data.fecha);
  if (!fecha) return { error: "Fecha inválida." };

  const integrantes = parseIntegrantes(integrantesRaw);
  const clientesIds = parseClienteIds(clientesIdsRaw);
  const compromisosForm = parseCompromisos(compromisosRaw);

  try {
    const [inserted] = await db
      .insert(actasReunion)
      .values({
        fecha,
        objetivo: parsed.data.objetivo,
        contenido: contenido || null,
        compromisos: null,
        estado: "borrador",
        creadoPorId: session.user.id,
      })
      .returning({ id: actasReunion.id });

    if (!inserted) throw new Error("No se pudo crear el acta");

    let integranteIds: number[] = [];
    if (integrantes.length > 0) {
      const insertedIntegrantes = await db
        .insert(actasIntegrantes)
        .values(
          integrantes.map((i) => {
            const tipo = i.tipo ?? (i.usuarioId ? "interno" : "externo");
            return {
              actaId: inserted.id,
              tipo,
              nombre: i.nombre,
              email: i.email,
              cargo: tipo === "externo" ? (i.cargo?.trim() || null) : null,
              usuarioId: i.usuarioId ?? null,
              solicitarAprobacionCorreo: i.solicitarAprobacionCorreo ?? true,
            };
          })
        )
        .returning({ id: actasIntegrantes.id });
      integranteIds = insertedIntegrantes.map((r) => r.id);
    }

    if (compromisosForm.length > 0) {
      await db.insert(compromisosActa).values(
        compromisosForm.map((c) => {
          const actaIntegranteId =
            c.asignadoClienteMiembroId == null &&
            c.asignadoIndex != null &&
            c.asignadoIndex >= 0 &&
            c.asignadoIndex < integranteIds.length
              ? integranteIds[c.asignadoIndex]
              : null;
          const clienteMiembroId =
            c.asignadoClienteMiembroId != null && c.asignadoClienteMiembroId > 0
              ? c.asignadoClienteMiembroId
              : null;
          const fechaLimite = parseFecha(c.fechaLimite ?? "");
          return {
            actaId: inserted.id,
            descripcion: c.descripcion,
            fechaLimite: fechaLimite || null,
            actaIntegranteId,
            clienteMiembroId,
          };
        })
      );
    }

    if (clientesIds.length > 0) {
      await db.insert(actasReunionClientes).values(
        clientesIds.map((clienteId) => ({ actaId: inserted.id, clienteId }))
      );
    }

    await db.insert(historialActa).values({
      actaId: inserted.id,
      usuarioId: session.user.id,
      tipoEvento: "creacion",
    });

    revalidatePath("/actas");
    redirect(`/actas/${inserted.id}`);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string"
    ) {
      throw err;
    }
    console.error(err);
    return { error: "Error al crear el acta. Intenta de nuevo." };
  }
}

export async function actualizarActa(
  _prev: EstadoFormActa | null,
  formData: FormData
): Promise<EstadoFormActa> {
  const session = await getSession();
  if (!session?.user) return { error: "Debes iniciar sesión." };

  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" ? parseInt(idRaw, 10) : Number(idRaw);
  const fechaStr = (formData.get("fecha") as string)?.trim();
  const objetivo = (formData.get("objetivo") as string)?.trim() ?? "";
  const contenido = (formData.get("contenido") as string)?.trim() || null;
  const compromisosRaw = formData.get("compromisos");
  const integrantesRaw = formData.get("integrantes");
  const clientesIdsRaw = formData.get("clientesIds");

  const parsed = schemaActualizar.safeParse({
    id: Number.isNaN(id) ? undefined : id,
    fecha: fechaStr,
    objetivo,
    contenido: contenido ?? "",
    compromisos: typeof compromisosRaw === "string" ? compromisosRaw : "",
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const errores = flat.fieldErrors as Record<string, string[] | undefined>;
    return {
      error: flat.formErrors.join(" ") || "Datos inválidos",
      errores: Object.keys(errores).length ? (errores as Record<string, string[]>) : undefined,
    };
  }

  const fecha = parseFecha(parsed.data.fecha);
  if (!fecha) return { error: "Fecha inválida." };

  const integrantes = parseIntegrantes(integrantesRaw);
  const clientesIds = parseClienteIds(clientesIdsRaw);
  const compromisosForm = parseCompromisos(compromisosRaw);

  try {
    const [existing] = await db
      .select({ estado: actasReunion.estado, creadoPorId: actasReunion.creadoPorId })
      .from(actasReunion)
      .where(eq(actasReunion.id, parsed.data.id));
    if (!existing) return { error: "Acta no encontrada." };
    if (existing.estado !== "borrador") {
      return { error: "Solo se pueden editar actas en estado borrador." };
    }
    const isCreador = existing.creadoPorId === session.user.id;
    const isAdmin = session.user.rol === "admin";
    if (!isCreador && !isAdmin) {
      return { error: "No tienes permiso para editar este acta." };
    }

    await db
      .update(actasReunion)
      .set({
        fecha,
        objetivo: parsed.data.objetivo,
        contenido: contenido || null,
        compromisos: null,
        actualizadoEn: new Date(),
      })
      .where(eq(actasReunion.id, parsed.data.id));

    await db.delete(compromisosActa).where(eq(compromisosActa.actaId, parsed.data.id));
    await db.delete(actasIntegrantes).where(eq(actasIntegrantes.actaId, parsed.data.id));
    let integranteIds: number[] = [];
    if (integrantes.length > 0) {
      const insertedIntegrantes = await db
        .insert(actasIntegrantes)
        .values(
          integrantes.map((i) => {
            const tipo = i.tipo ?? (i.usuarioId ? "interno" : "externo");
            return {
              actaId: parsed.data.id,
              tipo,
              nombre: i.nombre,
              email: i.email,
              cargo: tipo === "externo" ? (i.cargo?.trim() || null) : null,
              usuarioId: i.usuarioId ?? null,
              solicitarAprobacionCorreo: i.solicitarAprobacionCorreo ?? true,
            };
          })
        )
        .returning({ id: actasIntegrantes.id });
      integranteIds = insertedIntegrantes.map((r) => r.id);
    }
    if (compromisosForm.length > 0) {
      await db.insert(compromisosActa).values(
        compromisosForm.map((c) => {
          const actaIntegranteId =
            c.asignadoClienteMiembroId == null &&
            c.asignadoIndex != null &&
            c.asignadoIndex >= 0 &&
            c.asignadoIndex < integranteIds.length
              ? integranteIds[c.asignadoIndex]
              : null;
          const clienteMiembroId =
            c.asignadoClienteMiembroId != null && c.asignadoClienteMiembroId > 0
              ? c.asignadoClienteMiembroId
              : null;
          const fechaLimite = parseFecha(c.fechaLimite ?? "");
          return {
            actaId: parsed.data.id,
            descripcion: c.descripcion,
            fechaLimite: fechaLimite || null,
            actaIntegranteId,
            clienteMiembroId,
          };
        })
      );
    }

    await db.delete(actasReunionClientes).where(eq(actasReunionClientes.actaId, parsed.data.id));
    if (clientesIds.length > 0) {
      await db.insert(actasReunionClientes).values(
        clientesIds.map((clienteId) => ({ actaId: parsed.data.id, clienteId }))
      );
    }

    await db.insert(historialActa).values({
      actaId: parsed.data.id,
      usuarioId: session.user.id,
      tipoEvento: "edicion",
      metadata: { campos: ["fecha", "objetivo", "contenido", "compromisos", "integrantes", "clientes"] },
    });

    revalidatePath("/actas");
    revalidatePath(`/actas/${parsed.data.id}`);
    revalidatePath(`/actas/${parsed.data.id}/editar`);
    redirect(`/actas/${parsed.data.id}`);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string"
    ) {
      throw err;
    }
    console.error(err);
    return { error: "Error al actualizar el acta. Intenta de nuevo." };
  }
}

export async function enviarActaAprobacion(actaId: number): Promise<EstadoGestionActa> {
  const session = await getSession();
  if (!session?.user) return { error: "Debes iniciar sesión." };

  if (!Number.isInteger(actaId) || actaId < 1) return { error: "Acta inválida." };

  try {
    const [acta] = await db
      .select({ estado: actasReunion.estado, creadoPorId: actasReunion.creadoPorId })
      .from(actasReunion)
      .where(eq(actasReunion.id, actaId));
    if (!acta) return { error: "Acta no encontrada." };
    if (acta.estado !== "borrador") return { error: "Solo se puede enviar a aprobación un acta en borrador." };
    const isCreador = acta.creadoPorId === session.user.id;
    const isAdmin = session.user.rol === "admin";
    if (!isCreador && !isAdmin) return { error: "No tienes permiso para enviar este acta a aprobación." };

    await db
      .update(actasReunion)
      .set({ estado: "pendiente_aprobacion", actualizadoEn: new Date() })
      .where(eq(actasReunion.id, actaId));

    await db.insert(historialActa).values({
      actaId,
      usuarioId: session.user.id,
      tipoEvento: "envio_aprobacion",
    });

    revalidatePath("/actas");
    revalidatePath(`/actas/${actaId}`);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "Error al enviar el acta a aprobación." };
  }
}

export async function aprobarActa(actaId: number): Promise<EstadoGestionActa> {
  const session = await requireAdminSession();
  if (!session) return { error: "Solo un administrador puede aprobar actas." };

  if (!Number.isInteger(actaId) || actaId < 1) return { error: "Acta inválida." };

  try {
    const [acta] = await db
      .select({ estado: actasReunion.estado })
      .from(actasReunion)
      .where(eq(actasReunion.id, actaId));
    if (!acta) return { error: "Acta no encontrada." };
    if (acta.estado !== "pendiente_aprobacion") {
      return { error: "Solo se pueden aprobar actas en estado pendiente de aprobación." };
    }

    await db
      .update(actasReunion)
      .set({
        estado: "aprobada",
        aprobadoPorId: session.user.id,
        actualizadoEn: new Date(),
      })
      .where(eq(actasReunion.id, actaId));

    await db.insert(historialActa).values({
      actaId,
      usuarioId: session.user.id,
      tipoEvento: "aprobacion",
    });

    revalidatePath("/actas");
    revalidatePath(`/actas/${actaId}`);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "Error al aprobar el acta." };
  }
}

export async function enviarActaPorCorreo(actaId: number): Promise<EstadoGestionActa> {
  const session = await requireAdminSession();
  if (!session) return { error: "Solo un administrador puede enviar actas por correo." };

  if (!Number.isInteger(actaId) || actaId < 1) return { error: "Acta inválida." };

  try {
    const acta = await obtenerActaPorId(actaId);
    if (!acta) return { error: "Acta no encontrada." };
    if (acta.estado !== "aprobada") {
      return { error: "Solo se pueden enviar por correo actas aprobadas." };
    }

    const { enviarActaPorEmail } = await import("@/lib/notificaciones/resend");
    const integrantesConEmail = acta.integrantes.filter(
      (i) => i.email?.trim() && i.solicitarAprobacionCorreo
    );

    const contactosCliente = await db
      .select({
        emailContacto: clientes.emailContacto,
        nombreContacto: clientes.nombreContacto,
        nombreCliente: clientes.nombre,
      })
      .from(actasReunionClientes)
      .innerJoin(clientes, eq(actasReunionClientes.clienteId, clientes.id))
      .where(
        and(
          eq(actasReunionClientes.actaId, actaId),
          eq(clientes.activo, true)
        )
      );

    const contactosConEmail = contactosCliente.filter(
      (c) => c.emailContacto?.trim()
    );
    const emailsIntegrantes = new Set(
      integrantesConEmail.map((i) => i.email!.trim().toLowerCase())
    );
    const contactosDestino = contactosConEmail.filter(
      (c) => !emailsIntegrantes.has(c.emailContacto!.trim().toLowerCase())
    );

    if (integrantesConEmail.length === 0 && contactosDestino.length === 0) {
      return {
        error:
          "No hay destinatarios: agrega asistentes con «Solicitar aprobación por correo» y/o configura el correo de contacto en los clientes asociados al acta.",
      };
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const baseUrlClean = baseUrl.replace(/\/$/, "");

    const datosComunes = {
      fechaActa: acta.fecha,
      objetivo: acta.objetivo,
      contenidoHtml: acta.contenido ?? "",
      compromisosHtml:
        acta.compromisosLista.length > 0
          ? acta.compromisosLista
              .map((c) => {
                const fechaStr = c.fechaLimite
                  ? new Date(c.fechaLimite).toLocaleDateString("es-CO", { dateStyle: "short" })
                  : "—";
                const asignado = c.asignadoNombre ?? "—";
                return `${c.descripcion} — Fecha límite: ${fechaStr} — Asignado: ${asignado}`;
              })
              .join("\n")
          : acta.compromisos ?? undefined,
      enlaceActa: `/actas/${actaId}`,
    };

    let enviados = 0;
    for (const inv of integrantesConEmail) {
      const firma = generarFirmaAprobacion(actaId, inv.id);
      const enlaceAprobarParticipante = `${baseUrlClean}/actas/aprobar-participante?acta=${actaId}&integrante=${inv.id}&firma=${firma}`;
      const resultado = await enviarActaPorEmail(inv.email, {
        ...datosComunes,
        nombreDestinatario: inv.nombre,
        enlaceAprobarParticipante,
      });
      if (resultado.ok) enviados++;
    }

    for (const c of contactosDestino) {
      const nombreDestinatario =
        c.nombreContacto?.trim() || c.nombreCliente || "Contacto";
      const resultado = await enviarActaPorEmail(c.emailContacto!.trim(), {
        ...datosComunes,
        nombreDestinatario,
        enlaceAprobarParticipante: undefined,
      });
      if (resultado.ok) enviados++;
    }

    await db
      .update(actasReunion)
      .set({ estado: "enviada", actualizadoEn: new Date() })
      .where(eq(actasReunion.id, actaId));

    await db.insert(historialActa).values({
      actaId,
      usuarioId: session.user.id,
      tipoEvento: "envio_correo",
      metadata: {
        destinatarios: enviados,
        total: integrantesConEmail.length + contactosDestino.length,
      },
    });

    revalidatePath("/actas");
    revalidatePath(`/actas/${actaId}`);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "Error al enviar el acta por correo." };
  }
}

/**
 * Valida el enlace de aprobación (firma, acta enviada, integrante pertenece al acta).
 * No registra la aprobación. Útil para mostrar la vista previa.
 */
export async function validarEnlaceAprobacionParticipante(
  actaId: number,
  integranteId: number,
  firma: string
): Promise<{ valido: boolean; error?: string }> {
  if (!Number.isInteger(actaId) || actaId < 1 || !Number.isInteger(integranteId) || integranteId < 1) {
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

/**
 * Indica si el participante (integrante) ya aprobó este acta.
 */
export async function yaAprobadoParticipante(
  actaId: number,
  integranteId: number
): Promise<boolean> {
  if (!Number.isInteger(actaId) || actaId < 1 || !Number.isInteger(integranteId) || integranteId < 1) {
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

/**
 * Action para formulario de aprobación desde la vista previa: registra la aprobación sin foto; redirige con aprobado=1 o error=1.
 * Acepta (formData) o (prev, formData) según cómo se invoque el form.
 */
export async function aprobarParticipanteFromPreviewAction(
  prevOrFormData: unknown,
  formDataArg?: FormData
): Promise<void> {
  const formData = formDataArg instanceof FormData ? formDataArg : (prevOrFormData as FormData);
  const actaId = Number(formData.get("actaId"));
  const integranteId = Number(formData.get("integranteId"));
  const firma = (formData.get("firma") as string) ?? "";
  const base = "/actas/aprobar-participante";
  const query = `acta=${actaId}&integrante=${integranteId}&firma=${encodeURIComponent(firma.trim())}`;

  const result = await registrarAprobacionParticipante(
    actaId,
    integranteId,
    firma.trim(),
    null
  );
  if (result.error) {
    redirect(`${base}?${query}&error=1`);
  }
  redirect(`${base}?${query}&aprobado=1`);
}

/**
 * Registra la aprobación de un participante (enlace del correo).
 * No requiere sesión. Verifica firma, estado enviada y que el integrante pertenezca al acta.
 * Ya no se guarda foto de aprobación (rutaFoto se mantiene en schema por compatibilidad).
 */
export async function registrarAprobacionParticipante(
  actaId: number,
  integranteId: number,
  firma: string,
  rutaFoto?: string | null
): Promise<{ error?: string }> {
  if (!Number.isInteger(actaId) || actaId < 1 || !Number.isInteger(integranteId) || integranteId < 1) {
    return { error: "Enlace inválido." };
  }
  if (!verificarFirmaAprobacion(actaId, integranteId, firma)) {
    return { error: "Enlace inválido o expirado." };
  }
  try {
    const [acta] = await db
      .select({ estado: actasReunion.estado })
      .from(actasReunion)
      .where(eq(actasReunion.id, actaId));
    if (!acta || acta.estado !== "enviada") {
      return { error: "Enlace inválido o expirado." };
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
      return { error: "Enlace inválido o expirado." };
    }
    await db
      .insert(aprobacionesActaParticipante)
      .values({
        actaId,
        actaIntegranteId: integranteId,
        rutaFoto: rutaFoto?.trim() || null,
        rechazado: false,
      })
      .onConflictDoNothing({
        target: [
          aprobacionesActaParticipante.actaId,
          aprobacionesActaParticipante.actaIntegranteId,
        ],
      });
    return {};
  } catch (err) {
    console.error(err);
    return { error: "Error al registrar la aprobación." };
  }
}

/**
 * Registra el rechazo de un participante (con motivo).
 * Misma validación de firma y estado que la aprobación.
 */
export async function registrarRechazoParticipante(
  actaId: number,
  integranteId: number,
  firma: string,
  motivoRechazo: string
): Promise<{ error?: string }> {
  if (!Number.isInteger(actaId) || actaId < 1 || !Number.isInteger(integranteId) || integranteId < 1) {
    return { error: "Enlace inválido." };
  }
  if (!verificarFirmaAprobacion(actaId, integranteId, firma)) {
    return { error: "Enlace inválido o expirado." };
  }
  try {
    const [acta] = await db
      .select({ estado: actasReunion.estado })
      .from(actasReunion)
      .where(eq(actasReunion.id, actaId));
    if (!acta || acta.estado !== "enviada") {
      return { error: "Enlace inválido o expirado." };
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
      return { error: "Enlace inválido o expirado." };
    }
    await db
      .insert(aprobacionesActaParticipante)
      .values({
        actaId,
        actaIntegranteId: integranteId,
        rechazado: true,
        motivoRechazo: motivoRechazo.trim() || null,
      })
      .onConflictDoNothing({
        target: [
          aprobacionesActaParticipante.actaId,
          aprobacionesActaParticipante.actaIntegranteId,
        ],
      });
    await db.insert(historialActa).values({
      actaId,
      usuarioId: null,
      tipoEvento: "rechazo_participante",
      metadata: { actaIntegranteId: integranteId, motivo: motivoRechazo.trim() || null },
    });
    return {};
  } catch (err) {
    console.error(err);
    return { error: "Error al registrar el rechazo." };
  }
}

/**
 * Action para formulario de rechazo desde la vista previa.
 * Acepta (formData) o (prev, formData) según cómo se invoque el form.
 */
export async function rechazarParticipanteFromPreviewAction(
  prevOrFormData: unknown,
  formDataArg?: FormData
): Promise<void> {
  const formData = formDataArg instanceof FormData ? formDataArg : (prevOrFormData as FormData);
  const actaId = Number(formData.get("actaId"));
  const integranteId = Number(formData.get("integranteId"));
  const firma = (formData.get("firma") as string) ?? "";
  const motivoRechazo = (formData.get("motivoRechazo") as string) ?? "";
  const base = "/actas/aprobar-participante";
  const query = `acta=${actaId}&integrante=${integranteId}&firma=${encodeURIComponent(firma.trim())}`;

  const result = await registrarRechazoParticipante(
    actaId,
    integranteId,
    firma.trim(),
    motivoRechazo
  );
  if (result.error) {
    redirect(`${base}?${query}&error=1`);
  }
  redirect(`${base}?${query}&rechazado=1`);
}

/**
 * Devuelve si el participante ya respondió (aprobó o rechazó) y en su caso el tipo y motivo.
 */
export async function obtenerRespuestaParticipante(
  actaId: number,
  integranteId: number
): Promise<{ respondido: boolean; rechazado?: boolean; motivoRechazo?: string | null }> {
  if (!Number.isInteger(actaId) || actaId < 1 || !Number.isInteger(integranteId) || integranteId < 1) {
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

/**
 * Devuelve la lista de integrantes del acta con indicador de si aprobaron y cuándo.
 * Para actas en estado enviada; usado en la vista de detalle.
 */
export async function obtenerAprobacionesPorActa(
  actaId: number
): Promise<AprobacionParticipanteItem[]> {
  if (!Number.isInteger(actaId) || actaId < 1) return [];
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

export async function eliminarActa(actaId: number): Promise<EstadoGestionActa> {
  const session = await getSession();
  if (!session?.user) return { error: "Debes iniciar sesión." };

  if (!Number.isInteger(actaId) || actaId < 1) return { error: "Acta inválida." };

  try {
    const [acta] = await db
      .select({ estado: actasReunion.estado, creadoPorId: actasReunion.creadoPorId })
      .from(actasReunion)
      .where(eq(actasReunion.id, actaId));
    if (!acta) return { error: "Acta no encontrada." };
    if (acta.estado !== "borrador") return { error: "Solo se pueden eliminar actas en borrador." };
    const isCreador = acta.creadoPorId === session.user.id;
    const isAdmin = session.user.rol === "admin";
    if (!isCreador && !isAdmin) return { error: "No tienes permiso para eliminar este acta." };

    await db.delete(actasReunion).where(eq(actasReunion.id, actaId));
    revalidatePath("/actas");
    redirect("/actas");
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string"
    ) {
      throw err;
    }
    console.error(err);
    return { error: "Error al eliminar el acta." };
  }
}

/** Wrapper para useActionState: envía el acta a aprobación. */
export async function enviarActaAprobacionAction(
  _prev: EstadoGestionActa | null,
  formData: FormData
): Promise<EstadoGestionActa> {
  const actaId = Number(formData.get("actaId"));
  return enviarActaAprobacion(actaId);
}

/** Wrapper para useActionState: aprueba el acta (solo admin). */
export async function aprobarActaAction(
  _prev: EstadoGestionActa | null,
  formData: FormData
): Promise<EstadoGestionActa> {
  const actaId = Number(formData.get("actaId"));
  return aprobarActa(actaId);
}

/** Wrapper para useActionState: envía el acta por correo (solo admin). */
export async function enviarActaPorCorreoAction(
  _prev: EstadoGestionActa | null,
  formData: FormData
): Promise<EstadoGestionActa> {
  const actaId = Number(formData.get("actaId"));
  return enviarActaPorCorreo(actaId);
}

/** Wrapper para useActionState: elimina el acta (solo borrador). */
export async function eliminarActaAction(
  _prev: EstadoGestionActa | null,
  formData: FormData
): Promise<EstadoGestionActa> {
  const actaId = Number(formData.get("actaId"));
  return eliminarActa(actaId);
}

export async function obtenerHistorialActa(actaId: number): Promise<HistorialActaItem[]> {
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
