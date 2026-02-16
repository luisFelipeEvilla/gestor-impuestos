"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  actasReunion,
  actasIntegrantes,
  actasReunionClientes,
  actasReunionActividades,
  compromisosActa,
  historialActa,
  aprobacionesActaParticipante,
  clientes,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generarFirmaAprobacion, verificarFirmaAprobacion } from "@/lib/actas-aprobacion";
import { getSession, requireAdminSession } from "@/lib/auth-server";
import type { EstadoFormActa, EstadoGestionActa } from "@/lib/actions/actas-types";
import {
  schemaCrear,
  schemaActualizar,
  parseFecha,
  parseIntegrantes,
  parseClienteIds,
  parseActividadesIds,
  parseCompromisos,
} from "./parsers";
import {
  obtenerSnapshotAuditoriaActa,
  snapshotDespuesEdicion,
} from "./auditoria";
import { obtenerActaPorId } from "./queries";

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
  const actividadesIdsRaw = formData.get("actividadesIds");

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
  const actividadesIds = parseActividadesIds(actividadesIdsRaw);
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

    if (actividadesIds.length > 0) {
      await db.insert(actasReunionActividades).values(
        actividadesIds.map((actividadId) => ({ actaId: inserted.id, actividadId }))
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
  const id = typeof idRaw === "string" ? idRaw.trim() : "";
  const fechaStr = (formData.get("fecha") as string)?.trim();
  const objetivo = (formData.get("objetivo") as string)?.trim() ?? "";
  const contenido = (formData.get("contenido") as string)?.trim() || null;
  const compromisosRaw = formData.get("compromisos");
  const integrantesRaw = formData.get("integrantes");
  const clientesIdsRaw = formData.get("clientesIds");
  const actividadesIdsRaw = formData.get("actividadesIds");

  const parsed = schemaActualizar.safeParse({
    id: id || undefined,
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
  const actividadesIds = parseActividadesIds(actividadesIdsRaw);
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

    const antes = await obtenerSnapshotAuditoriaActa(parsed.data.id);
    const despues = snapshotDespuesEdicion(
      parsed.data.fecha,
      parsed.data.objetivo,
      contenido || null,
      integrantes,
      clientesIds,
      actividadesIds,
      compromisosForm
    );

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

    await db.delete(actasReunionActividades).where(eq(actasReunionActividades.actaId, parsed.data.id));
    if (actividadesIds.length > 0) {
      await db.insert(actasReunionActividades).values(
        actividadesIds.map((actividadId) => ({ actaId: parsed.data.id, actividadId }))
      );
    }

    await db.insert(historialActa).values({
      actaId: parsed.data.id,
      usuarioId: session.user.id,
      tipoEvento: "edicion",
      metadata: { antes: antes ?? undefined, despues },
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

export async function enviarActaAprobacion(actaId: string): Promise<EstadoGestionActa> {
  const session = await getSession();
  if (!session?.user) return { error: "Debes iniciar sesión." };

  if (!actaId || typeof actaId !== "string") return { error: "Acta inválida." };

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

export async function aprobarActa(actaId: string): Promise<EstadoGestionActa> {
  const session = await requireAdminSession();
  if (!session) return { error: "Solo un administrador puede aprobar actas." };

  if (!actaId || typeof actaId !== "string") return { error: "Acta inválida." };

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

export async function enviarActaPorCorreo(actaId: string): Promise<EstadoGestionActa> {
  const session = await requireAdminSession();
  if (!session) return { error: "Solo un administrador puede enviar actas por correo." };

  if (!actaId || typeof actaId !== "string") return { error: "Acta inválida." };

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

export async function eliminarActa(actaId: string): Promise<EstadoGestionActa> {
  const session = await getSession();
  if (!session?.user) return { error: "Debes iniciar sesión." };

  if (!actaId || typeof actaId !== "string") return { error: "Acta inválida." };

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

export async function aprobarParticipanteFromPreviewAction(
  prevOrFormData: unknown,
  formDataArg?: FormData
): Promise<void> {
  const formData = formDataArg instanceof FormData ? formDataArg : (prevOrFormData as FormData);
  const actaId = String(formData.get("actaId") ?? "").trim();
  const integranteId = Number(formData.get("integranteId"));
  const firma = (formData.get("firma") as string) ?? "";
  const base = "/actas/aprobar-participante";
  const query = `acta=${encodeURIComponent(actaId)}&integrante=${integranteId}&firma=${encodeURIComponent(firma.trim())}`;

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

export async function registrarAprobacionParticipante(
  actaId: string,
  integranteId: number,
  firma: string,
  rutaFoto?: string | null
): Promise<{ error?: string }> {
  if (!actaId || typeof actaId !== "string" || !Number.isInteger(integranteId) || integranteId < 1) {
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

export async function registrarRechazoParticipante(
  actaId: string,
  integranteId: number,
  firma: string,
  motivoRechazo: string
): Promise<{ error?: string }> {
  if (!actaId || typeof actaId !== "string" || !Number.isInteger(integranteId) || integranteId < 1) {
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

export async function rechazarParticipanteFromPreviewAction(
  prevOrFormData: unknown,
  formDataArg?: FormData
): Promise<void> {
  const formData = formDataArg instanceof FormData ? formDataArg : (prevOrFormData as FormData);
  const actaId = String(formData.get("actaId") ?? "").trim();
  const integranteId = Number(formData.get("integranteId"));
  const firma = (formData.get("firma") as string) ?? "";
  const motivoRechazo = (formData.get("motivoRechazo") as string) ?? "";
  const base = "/actas/aprobar-participante";
  const query = `acta=${encodeURIComponent(actaId)}&integrante=${integranteId}&firma=${encodeURIComponent(firma.trim())}`;

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

export async function enviarActaAprobacionAction(
  _prev: EstadoGestionActa | null,
  formData: FormData
): Promise<EstadoGestionActa> {
  const actaId = String(formData.get("actaId") ?? "").trim();
  return enviarActaAprobacion(actaId);
}

export async function aprobarActaAction(
  _prev: EstadoGestionActa | null,
  formData: FormData
): Promise<EstadoGestionActa> {
  const actaId = String(formData.get("actaId") ?? "").trim();
  return aprobarActa(actaId);
}

export async function enviarActaPorCorreoAction(
  _prev: EstadoGestionActa | null,
  formData: FormData
): Promise<EstadoGestionActa> {
  const actaId = String(formData.get("actaId") ?? "").trim();
  return enviarActaPorCorreo(actaId);
}

export async function eliminarActaAction(
  _prev: EstadoGestionActa | null,
  formData: FormData
): Promise<EstadoGestionActa> {
  const actaId = String(formData.get("actaId") ?? "").trim();
  return eliminarActa(actaId);
}
