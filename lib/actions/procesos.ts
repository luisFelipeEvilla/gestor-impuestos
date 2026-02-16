"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { procesos, historialProceso, impuestos, contribuyentes, usuarios, documentosProceso } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  enviarNotificacionCobroPorEmail,
  crearEvidenciaEnvio,
} from "@/lib/notificaciones/resend";
import { getSession } from "@/lib/auth-server";
import { saveProcesoDocument, isAllowedMime, isAllowedSize } from "@/lib/uploads";

/** Solo admin o el usuario asignado al proceso pueden acceder. */
function puedeAccederProceso(
  rol: string | undefined,
  usuarioId: number | undefined,
  asignadoAId: number | null
): boolean {
  if (rol === "admin") return true;
  if (usuarioId == null) return false;
  return asignadoAId === usuarioId;
}

/** Años para prescripción: fecha límite = base (aplicación o ingreso a cobro coactivo) + este valor */
const AÑOS_PRESCRIPCION = 5;

/** Suma años a una fecha ISO (YYYY-MM-DD) y devuelve YYYY-MM-DD */
function addYears(isoDate: string, years: number): string {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/**
 * Calcula la fecha límite por prescripción: 5 años desde la base.
 * Base = fecha de ingreso a cobro coactivo si existe, si no fecha de aplicación del impuesto.
 */
function computeFechaLimitePrescripcion(
  fechaAplicacionImpuesto: string | null,
  fechaInicioCobroCoactivo: string | null
): string | null {
  const base = fechaInicioCobroCoactivo ?? fechaAplicacionImpuesto;
  return base ? addYears(base, AÑOS_PRESCRIPCION) : null;
}

const estadoProcesoValues = [
  "pendiente",
  "asignado",
  "notificado",
  "en_contacto",
  "en_negociacion",
  "cobrado",
  "incobrable",
  "en_cobro_coactivo",
  "suspendido",
] as const;

/** No se puede pasar de acuerdo de pago (en_negociacion) o cobro coactivo a cobrado. */
const ESTADOS_PROHIBIDOS_COBRADO: (typeof estadoProcesoValues)[number][] = [
  "en_negociacion",
  "en_cobro_coactivo",
];

const schemaCrear = z.object({
  impuestoId: z.coerce.number().int().positive("Selecciona un impuesto"),
  contribuyenteId: z.coerce.number().int().positive("Selecciona un contribuyente"),
  vigencia: z.coerce.number().int().min(2000, "Vigencia inválida").max(2100),
  periodo: z.string().max(50).optional().or(z.literal("")),
  montoCop: z.string().min(1, "El monto es obligatorio").refine(
    (v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) >= 0,
    "Monto debe ser un número positivo (ej. 1500000.50)"
  ),
  estadoActual: z.enum(estadoProcesoValues).default("pendiente"),
  asignadoAId: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : parseInt(v, 10)))
    .refine((v) => v === undefined || (Number.isInteger(v) && v! > 0), "Usuario inválido"),
  fechaLimite: z.string().optional().or(z.literal("")),
  numeroResolucion: z.string().max(100).optional().or(z.literal("")),
  fechaResolucion: z.string().optional().or(z.literal("")),
  fechaAplicacionImpuesto: z.string().optional().or(z.literal("")),
});

const schemaActualizar = schemaCrear.extend({
  id: z.number().int().positive(),
});

export type EstadoFormProceso = {
  error?: string;
  errores?: Record<string, string[]>;
};

/** Returns ISO date string (YYYY-MM-DD) for PostgreSQL date column, or null. */
function parseFecha(value: string | undefined): string | null {
  if (!value || value.trim() === "") return null;
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : value.trim().slice(0, 10);
}

export async function crearProceso(
  _prev: EstadoFormProceso | null,
  formData: FormData
): Promise<EstadoFormProceso> {
  const raw = {
    impuestoId: formData.get("impuestoId"),
    contribuyenteId: formData.get("contribuyenteId"),
    vigencia: formData.get("vigencia"),
    periodo: formData.get("periodo") || undefined,
    montoCop: formData.get("montoCop"),
    estadoActual: formData.get("estadoActual") || "pendiente",
    asignadoAId: formData.get("asignadoAId") || undefined,
    fechaLimite: formData.get("fechaLimite") || undefined,
    numeroResolucion: formData.get("numeroResolucion") || undefined,
    fechaResolucion: formData.get("fechaResolucion") || undefined,
    fechaAplicacionImpuesto: formData.get("fechaAplicacionImpuesto") || undefined,
  };

  const parsed = schemaCrear.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const errores = flat.fieldErrors as Record<string, string[] | undefined>;
    return {
      error: flat.formErrors.join(" ") || "Datos inválidos",
      errores: Object.keys(errores).length ? (errores as Record<string, string[]>) : undefined,
    };
  }

  const {
    impuestoId,
    contribuyenteId,
    vigencia,
    periodo,
    montoCop,
    estadoActual: estadoForm,
    asignadoAId,
    fechaLimite,
    numeroResolucion,
    fechaResolucion,
    fechaAplicacionImpuesto,
  } = parsed.data;

  const tieneAsignacion = asignadoAId != null && asignadoAId > 0;
  const estadoActual = tieneAsignacion ? "asignado" : estadoForm;
  const fechaAplicacion = parseFecha(fechaAplicacionImpuesto);
  const fechaLimiteCalculada =
    fechaAplicacion != null
      ? computeFechaLimitePrescripcion(fechaAplicacion, null)
      : parseFecha(fechaLimite);

  try {
    const [inserted] = await db
      .insert(procesos)
      .values({
        impuestoId,
        contribuyenteId,
        vigencia,
        periodo: periodo?.trim() || null,
        montoCop,
        estadoActual,
        asignadoAId: asignadoAId ?? null,
        fechaLimite: fechaLimiteCalculada,
        numeroResolucion: numeroResolucion?.trim() || null,
        fechaResolucion: parseFecha(fechaResolucion),
        fechaAplicacionImpuesto: fechaAplicacion,
        fechaInicioCobroCoactivo: null,
      })
      .returning({ id: procesos.id });

    if (!inserted) throw new Error("No se pudo crear el proceso");
    await db.insert(historialProceso).values({
      procesoId: inserted.id,
      tipoEvento: "cambio_estado",
      estadoAnterior: tieneAsignacion ? "pendiente" : null,
      estadoNuevo: estadoActual,
      comentario: "Proceso creado",
    });
    if (tieneAsignacion) {
      await db.insert(historialProceso).values({
        procesoId: inserted.id,
        tipoEvento: "asignacion",
        comentario: "Proceso asignado al crear",
      });
    }
    revalidatePath("/procesos");
    revalidatePath("/");
    redirect(`/procesos/${inserted.id}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23503") {
      return {
        error: "El impuesto o el contribuyente no existe. Verifica que estén activos.",
      };
    }
    console.error(err);
    return { error: "Error al crear el proceso. Intenta de nuevo." };
  }
}

export async function actualizarProceso(
  _prev: EstadoFormProceso | null,
  formData: FormData
): Promise<EstadoFormProceso> {
  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" ? parseInt(idRaw, 10) : Number(idRaw);
  const raw = {
    id: Number.isNaN(id) ? undefined : id,
    impuestoId: formData.get("impuestoId"),
    contribuyenteId: formData.get("contribuyenteId"),
    vigencia: formData.get("vigencia"),
    periodo: formData.get("periodo") || undefined,
    montoCop: formData.get("montoCop"),
    estadoActual: formData.get("estadoActual") || "pendiente",
    asignadoAId: formData.get("asignadoAId") || undefined,
    fechaLimite: formData.get("fechaLimite") || undefined,
    numeroResolucion: formData.get("numeroResolucion") || undefined,
    fechaResolucion: formData.get("fechaResolucion") || undefined,
    fechaAplicacionImpuesto: formData.get("fechaAplicacionImpuesto") || undefined,
  };

  const parsed = schemaActualizar.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const errores = flat.fieldErrors as Record<string, string[] | undefined>;
    return {
      error: flat.formErrors.join(" ") || "Datos inválidos",
      errores: Object.keys(errores).length ? (errores as Record<string, string[]>) : undefined,
    };
  }

  const {
    impuestoId,
    contribuyenteId,
    vigencia,
    periodo,
    montoCop,
    estadoActual,
    asignadoAId,
    fechaLimite,
    numeroResolucion,
    fechaResolucion,
    fechaAplicacionImpuesto,
  } = parsed.data;

  try {
    const session = await getSession();
    const [existing] = await db
      .select({
        estadoActual: procesos.estadoActual,
        asignadoAId: procesos.asignadoAId,
      })
      .from(procesos)
      .where(eq(procesos.id, parsed.data.id));
    if (!existing) return { error: "Proceso no encontrado." };
    if (!puedeAccederProceso(session?.user?.rol, session?.user?.id, existing.asignadoAId ?? null)) {
      return { error: "No tienes permiso para editar este proceso." };
    }

    const entraCobroCoactivo =
      existing.estadoActual !== estadoActual && estadoActual === "en_cobro_coactivo";
    const hoyStr = new Date().toISOString().slice(0, 10);
    const fechaAplicacion = parseFecha(fechaAplicacionImpuesto);
    const fechaLimiteFinal = entraCobroCoactivo
      ? addYears(hoyStr, AÑOS_PRESCRIPCION)
      : parseFecha(fechaLimite);

    const [updated] = await db
      .update(procesos)
      .set({
        impuestoId,
        contribuyenteId,
        vigencia,
        periodo: periodo?.trim() || null,
        montoCop,
        estadoActual,
        asignadoAId: asignadoAId ?? null,
        fechaLimite: fechaLimiteFinal,
        numeroResolucion: numeroResolucion?.trim() || null,
        fechaResolucion: parseFecha(fechaResolucion),
        fechaAplicacionImpuesto: fechaAplicacion,
        ...(entraCobroCoactivo
          ? {
              fechaInicioCobroCoactivo: hoyStr,
            }
          : {}),
        actualizadoEn: new Date(),
      })
      .where(eq(procesos.id, parsed.data.id))
      .returning({ id: procesos.id });

    if (!updated) return { error: "Proceso no encontrado." };

    const cambiaEstado = existing.estadoActual !== estadoActual;
    const cambiaAsignacion = (existing.asignadoAId ?? null) !== (asignadoAId ?? null);
    if (cambiaEstado || cambiaAsignacion) {
      await db.insert(historialProceso).values({
        procesoId: parsed.data.id,
        tipoEvento: cambiaEstado ? "cambio_estado" : "asignacion",
        estadoAnterior: cambiaEstado ? existing.estadoActual : undefined,
        estadoNuevo: cambiaEstado ? estadoActual : undefined,
        comentario: cambiaEstado ? `Estado: ${estadoActual}` : "Cambio de asignación",
      });
    }

    revalidatePath("/procesos");
    revalidatePath(`/procesos/${parsed.data.id}`);
    revalidatePath(`/procesos/${parsed.data.id}/editar`);
    revalidatePath("/");
    redirect(`/procesos/${updated.id}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23503") {
      return {
        error: "El impuesto o el contribuyente no existe. Verifica que estén activos.",
      };
    }
    console.error(err);
    return { error: "Error al actualizar el proceso. Intenta de nuevo." };
  }
}

export async function eliminarProceso(formData: FormData): Promise<EstadoFormProceso> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "ID inválido." };
  try {
    const session = await getSession();
    const [row] = await db
      .select({ asignadoAId: procesos.asignadoAId })
      .from(procesos)
      .where(eq(procesos.id, id));
    if (!row) return { error: "Proceso no encontrado." };
    if (!puedeAccederProceso(session?.user?.rol, session?.user?.id, row.asignadoAId ?? null)) {
      return { error: "No tienes permiso para eliminar este proceso." };
    }
    const [deleted] = await db.delete(procesos).where(eq(procesos.id, id)).returning({ id: procesos.id });
    if (!deleted) return { error: "Proceso no encontrado." };
    revalidatePath("/procesos");
    revalidatePath("/");
    redirect("/procesos");
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al eliminar el proceso." };
  }
}

// --- Gestión del proceso (cambiar estado, asignar, agregar nota) ---

export type EstadoGestionProceso = { error?: string };

export async function cambiarEstadoProceso(
  _prev: EstadoGestionProceso | null,
  formData: FormData
): Promise<EstadoGestionProceso> {
  const procesoId = Number(formData.get("procesoId"));
  const nuevoEstado = formData.get("estadoActual") as string;
  const comentario = (formData.get("comentario") as string)?.trim() || null;

  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  const estadoValido = estadoProcesoValues.some((e) => e === nuevoEstado);
  if (!estadoValido) return { error: "Estado no válido." };

  try {
    const session = await getSession();
    const [proceso] = await db
      .select({ estadoActual: procesos.estadoActual, asignadoAId: procesos.asignadoAId })
      .from(procesos)
      .where(eq(procesos.id, procesoId));
    if (!proceso) return { error: "Proceso no encontrado." };
    if (!puedeAccederProceso(session?.user?.rol, session?.user?.id, proceso.asignadoAId ?? null)) {
      return { error: "No tienes permiso para modificar este proceso." };
    }

    if (
      nuevoEstado === "cobrado" &&
      ESTADOS_PROHIBIDOS_COBRADO.includes(proceso.estadoActual as (typeof estadoProcesoValues)[number])
    ) {
      return {
        error:
          "No se puede pasar a Cobrado desde En negociación o En cobro coactivo. Solo se marca Cobrado cuando el contribuyente realiza el pago desde En contacto.",
      };
    }

    const entraCobroCoactivo = nuevoEstado === "en_cobro_coactivo";
    const hoyStr = new Date().toISOString().slice(0, 10);
    await db
      .update(procesos)
      .set({
        estadoActual: nuevoEstado as (typeof estadoProcesoValues)[number],
        actualizadoEn: new Date(),
        ...(entraCobroCoactivo
          ? {
              fechaInicioCobroCoactivo: hoyStr,
              fechaLimite: addYears(hoyStr, AÑOS_PRESCRIPCION),
            }
          : {}),
      })
      .where(eq(procesos.id, procesoId));

    await db.insert(historialProceso).values({
      procesoId,
      tipoEvento: "cambio_estado",
      estadoAnterior: proceso.estadoActual,
      estadoNuevo: nuevoEstado as (typeof estadoProcesoValues)[number],
      comentario,
    });

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al cambiar el estado." };
  }
}

export async function asignarProceso(
  _prev: EstadoGestionProceso | null,
  formData: FormData
): Promise<EstadoGestionProceso> {
  const procesoId = Number(formData.get("procesoId"));
  const asignadoAIdRaw = formData.get("asignadoAId");
  const asignadoAId =
    asignadoAIdRaw === "" || asignadoAIdRaw === null ? null : Number(asignadoAIdRaw);

  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  if (asignadoAId !== null && (!Number.isInteger(asignadoAId) || asignadoAId < 1)) {
    return { error: "Usuario inválido." };
  }

  try {
    const session = await getSession();
    if (session?.user?.rol !== "admin") {
      return { error: "Solo un administrador puede asignar o reasignar procesos." };
    }
    const [proceso] = await db
      .select({
        asignadoAId: procesos.asignadoAId,
        estadoActual: procesos.estadoActual,
      })
      .from(procesos)
      .where(eq(procesos.id, procesoId));
    if (!proceso) return { error: "Proceso no encontrado." };

    const pasabaDeSinAsignarAAsignado =
      proceso.asignadoAId == null && asignadoAId != null;
    const nuevoEstado = pasabaDeSinAsignarAAsignado
      ? ("asignado" as const)
      : proceso.estadoActual;

    await db
      .update(procesos)
      .set({
        asignadoAId,
        estadoActual: nuevoEstado,
        actualizadoEn: new Date(),
      })
      .where(eq(procesos.id, procesoId));

    await db.insert(historialProceso).values({
      procesoId,
      tipoEvento: "asignacion",
      comentario: asignadoAId ? "Proceso asignado" : "Asignación removida",
    });
    if (pasabaDeSinAsignarAAsignado) {
      await db.insert(historialProceso).values({
        procesoId,
        tipoEvento: "cambio_estado",
        estadoAnterior: proceso.estadoActual,
        estadoNuevo: "asignado",
        comentario: "Estado actualizado al asignar responsable",
      });
    }

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al asignar el proceso." };
  }
}

const CATEGORIAS_NOTA = ["general", "en_contacto", "acuerdo_pago", "cobro_coactivo"] as const;

export async function agregarNotaProceso(
  _prev: EstadoGestionProceso | null,
  formData: FormData
): Promise<EstadoGestionProceso> {
  const procesoId = Number(formData.get("procesoId"));
  const comentario = (formData.get("comentario") as string)?.trim();
  const categoriaRaw = (formData.get("categoria") as string)?.trim() || "general";

  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  if (!comentario || comentario.length === 0) return { error: "Escribe un comentario." };
  if (!CATEGORIAS_NOTA.includes(categoriaRaw as (typeof CATEGORIAS_NOTA)[number])) {
    return { error: "Categoría de nota inválida." };
  }
  const categoriaNota = categoriaRaw as (typeof CATEGORIAS_NOTA)[number];

  try {
    const session = await getSession();
    const [proceso] = await db
      .select({ id: procesos.id, asignadoAId: procesos.asignadoAId })
      .from(procesos)
      .where(eq(procesos.id, procesoId));
    if (!proceso) return { error: "Proceso no encontrado." };
    if (!puedeAccederProceso(session?.user?.rol, session?.user?.id, proceso.asignadoAId ?? null)) {
      return { error: "No tienes permiso para agregar notas a este proceso." };
    }

    await db.insert(historialProceso).values({
      procesoId,
      tipoEvento: "nota",
      comentario,
      categoriaNota,
    });

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al agregar la nota." };
  }
}

/** Metadata del evento de notificación en historial: email (envíos) o física (documentoIds). */
export type MetadataNotificacion =
  | { envios?: unknown[] }
  | { tipo: "fisica"; documentoIds: number[] };

export async function enviarNotificacion(formData: FormData): Promise<EstadoGestionProceso> {
  const procesoId = Number(formData.get("procesoId"));
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  const tipoNotificacion = (formData.get("tipoNotificacion") as string)?.trim() || "email";
  if (tipoNotificacion === "fisica") {
    return registrarNotificacionFisica(procesoId, formData);
  }
  return registrarNotificacion(procesoId);
}

type RowProcesoNotificacion = {
  asignadoAId: number | null;
  estadoActual: string;
  montoCop: string;
  vigencia: number;
  periodo: string | null;
  contribuyenteNombre: string;
  contribuyenteEmail: string | null;
  impuestoNombre: string;
};

async function validarProcesoParaNotificacion(
  procesoId: number
): Promise<{ error: string } | { row: RowProcesoNotificacion }> {
  const session = await getSession();
  const [row] = await db
    .select({
      asignadoAId: procesos.asignadoAId,
      estadoActual: procesos.estadoActual,
      montoCop: procesos.montoCop,
      vigencia: procesos.vigencia,
      periodo: procesos.periodo,
      contribuyenteNombre: contribuyentes.nombreRazonSocial,
      contribuyenteEmail: contribuyentes.email,
      impuestoNombre: impuestos.nombre,
    })
    .from(procesos)
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
    .innerJoin(impuestos, eq(procesos.impuestoId, impuestos.id))
    .where(eq(procesos.id, procesoId));

  if (!row) return { error: "Proceso no encontrado." };
  if (!puedeAccederProceso(session?.user?.rol, session?.user?.id, row.asignadoAId ?? null)) {
    return { error: "No tienes permiso para notificar este proceso." };
  }

  const historialNotif = await db
    .select({ tipoEvento: historialProceso.tipoEvento })
    .from(historialProceso)
    .where(eq(historialProceso.procesoId, procesoId));
  const yaNotificado = historialNotif.some((r) => r.tipoEvento === "notificacion");
  if (yaNotificado) {
    return { error: "Este proceso ya fue notificado. Solo se puede notificar una vez." };
  }

  return { row };
}

async function registrarNotificacion(procesoId: number): Promise<EstadoGestionProceso> {
  try {
    const validacion = await validarProcesoParaNotificacion(procesoId);
    if ("error" in validacion) return { error: validacion.error };
    const row = validacion.row;

    const email = row.contribuyenteEmail?.trim();
    if (!email) {
      return {
        error:
          "El contribuyente no tiene correo electrónico registrado. Agregue un email al contribuyente para enviar la notificación.",
      };
    }

    const montoCopFormatted = new Intl.NumberFormat("es-CO", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(row.montoCop));

    const resultado = await enviarNotificacionCobroPorEmail(email, {
      nombreContribuyente: row.contribuyenteNombre,
      impuestoNombre: row.impuestoNombre,
      impuestoCodigo: row.impuestoNombre,
      montoCop: montoCopFormatted,
      vigencia: row.vigencia,
      periodo: row.periodo,
      procesoId,
    });

    if (!resultado.ok) {
      return { error: resultado.error };
    }

    const evidencia = crearEvidenciaEnvio(email, resultado.resendId);

    await db
      .update(procesos)
      .set({
        estadoActual: "notificado",
        actualizadoEn: new Date(),
      })
      .where(eq(procesos.id, procesoId));

    await db.insert(historialProceso).values({
      procesoId,
      tipoEvento: "notificacion",
      estadoAnterior: row.estadoActual,
      estadoNuevo: "notificado",
      comentario: "Notificación enviada por correo electrónico",
      metadata: { envios: [evidencia] },
    });

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    redirect(`/procesos/${procesoId}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al enviar la notificación." };
  }
}

async function registrarNotificacionFisica(
  procesoId: number,
  formData: FormData
): Promise<EstadoGestionProceso> {
  try {
    const validacion = await validarProcesoParaNotificacion(procesoId);
    if ("error" in validacion) return { error: validacion.error };
    const row = validacion.row;

    const files = formData.getAll("archivo") as File[];
    const archivos = files.filter((f): f is File => f instanceof File && f.size > 0);
    if (archivos.length === 0) {
      return { error: "Debe adjuntar al menos un archivo como evidencia de la notificación física." };
    }

    for (const file of archivos) {
      if (!isAllowedSize(file.size)) {
        return { error: "Uno o más archivos superan el tamaño máximo permitido (10 MB)." };
      }
      if (!isAllowedMime(file.type)) {
        return {
          error:
            "Tipo de archivo no permitido. Usa PDF, imágenes, Word, Excel o texto.",
        };
      }
    }

    const documentoIds: number[] = [];
    for (const file of archivos) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const storedFileName = await saveProcesoDocument(
        procesoId,
        buffer,
        file.name,
        file.type
      );
      const rutaArchivo = `procesos/${procesoId}/${storedFileName}`;
      const [inserted] = await db
        .insert(documentosProceso)
        .values({
          procesoId,
          categoria: "evidencia_notificacion",
          nombreOriginal: file.name,
          rutaArchivo,
          mimeType: file.type,
          tamano: file.size,
        })
        .returning({ id: documentosProceso.id });
      if (inserted) documentoIds.push(inserted.id);
    }

    if (documentoIds.length === 0) {
      return { error: "Error al guardar los archivos de evidencia." };
    }

    await db
      .update(procesos)
      .set({
        estadoActual: "notificado",
        actualizadoEn: new Date(),
      })
      .where(eq(procesos.id, procesoId));

    await db.insert(historialProceso).values({
      procesoId,
      tipoEvento: "notificacion",
      estadoAnterior: row.estadoActual,
      estadoNuevo: "notificado",
      comentario: "Notificación entregada por vía física",
      metadata: { tipo: "fisica", documentoIds },
    });

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath("/procesos");
    redirect(`/procesos/${procesoId}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al registrar la notificación física." };
  }
}
