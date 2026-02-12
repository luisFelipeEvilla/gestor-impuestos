"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  actasReunion,
  actasIntegrantes,
  actasReunionClientes,
  historialActa,
  usuarios,
  documentosActa,
  clientes,
} from "@/lib/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { getSession, requireAdminSession } from "@/lib/auth-server";

const estadoActaValues = ["borrador", "pendiente_aprobacion", "aprobada", "enviada"] as const;

const schemaCrear = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  objetivo: z.string().min(1, "El objetivo es obligatorio").max(2000),
  contenido: z.string().max(50000).optional().or(z.literal("")),
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
});

const integrantesSchema = z.array(integranteSchema);

export type EstadoFormActa = {
  error?: string;
  errores?: Record<string, string[]>;
};

export type EstadoGestionActa = { error?: string };

export type ActaListItem = {
  id: number;
  fecha: Date;
  objetivo: string;
  estado: (typeof estadoActaValues)[number];
  creadorNombre: string | null;
  numIntegrantes: number;
};

export type ActaDetalle = {
  id: number;
  fecha: Date;
  objetivo: string;
  contenido: string | null;
  estado: (typeof estadoActaValues)[number];
  creadoPorId: number;
  creadorNombre: string | null;
  aprobadoPorId: number | null;
  aprobadoPorNombre: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
  clientes: { id: number; nombre: string; codigo: string | null }[];
  integrantes: { id: number; nombre: string; email: string; usuarioId: number | null; tipo: "interno" | "externo" }[];
  documentos: { id: number; nombreOriginal: string; mimeType: string; tamano: number; creadoEn: Date }[];
};

export type HistorialActaItem = {
  id: number;
  fecha: Date;
  tipoEvento: string;
  usuarioNombre: string | null;
  metadata: unknown;
};

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

export async function obtenerActaPorId(actaId: number): Promise<ActaDetalle | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const [acta] = await db
    .select({
      id: actasReunion.id,
      fecha: actasReunion.fecha,
      objetivo: actasReunion.objetivo,
      contenido: actasReunion.contenido,
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
  const integrantesRaw = formData.get("integrantes");
  const clientesIdsRaw = formData.get("clientesIds");

  const parsed = schemaCrear.safeParse({ fecha: fechaStr, objetivo, contenido: contenido ?? "" });
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

  try {
    const [inserted] = await db
      .insert(actasReunion)
      .values({
        fecha,
        objetivo: parsed.data.objetivo,
        contenido: contenido || null,
        estado: "borrador",
        creadoPorId: session.user.id,
      })
      .returning({ id: actasReunion.id });

    if (!inserted) throw new Error("No se pudo crear el acta");

    if (integrantes.length > 0) {
      await db.insert(actasIntegrantes).values(
        integrantes.map((i) => ({
          actaId: inserted.id,
          tipo: i.tipo ?? (i.usuarioId ? "interno" : "externo"),
          nombre: i.nombre,
          email: i.email,
          usuarioId: i.usuarioId ?? null,
        }))
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
  const integrantesRaw = formData.get("integrantes");
  const clientesIdsRaw = formData.get("clientesIds");

  const parsed = schemaActualizar.safeParse({
    id: Number.isNaN(id) ? undefined : id,
    fecha: fechaStr,
    objetivo,
    contenido: contenido ?? "",
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

  try {
    const [existing] = await db
      .select({ estado: actasReunion.estado })
      .from(actasReunion)
      .where(eq(actasReunion.id, parsed.data.id));
    if (!existing) return { error: "Acta no encontrada." };
    if (existing.estado !== "borrador") {
      return { error: "Solo se pueden editar actas en estado borrador." };
    }

    await db
      .update(actasReunion)
      .set({
        fecha,
        objetivo: parsed.data.objetivo,
        contenido: contenido || null,
        actualizadoEn: new Date(),
      })
      .where(eq(actasReunion.id, parsed.data.id));

    await db.delete(actasIntegrantes).where(eq(actasIntegrantes.actaId, parsed.data.id));
    if (integrantes.length > 0) {
      await db.insert(actasIntegrantes).values(
        integrantes.map((i) => ({
          actaId: parsed.data.id,
          tipo: i.tipo ?? (i.usuarioId ? "interno" : "externo"),
          nombre: i.nombre,
          email: i.email,
          usuarioId: i.usuarioId ?? null,
        }))
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
      metadata: { campos: ["fecha", "objetivo", "contenido", "integrantes", "clientes"] },
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
    const integrantesConEmail = acta.integrantes.filter((i) => i.email?.trim());
    if (integrantesConEmail.length === 0) {
      return { error: "El acta no tiene integrantes con correo electrónico." };
    }

    let enviados = 0;
    for (const inv of integrantesConEmail) {
      const resultado = await enviarActaPorEmail(inv.email, {
        nombreDestinatario: inv.nombre,
        fechaActa: acta.fecha,
        objetivo: acta.objetivo,
        contenidoHtml: acta.contenido ?? "",
        enlaceActa: `/actas/${actaId}`,
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
      metadata: { destinatarios: enviados, total: integrantesConEmail.length },
    });

    revalidatePath("/actas");
    revalidatePath(`/actas/${actaId}`);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "Error al enviar el acta por correo." };
  }
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
