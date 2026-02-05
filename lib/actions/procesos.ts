"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { procesos, historialProceso, impuestos, contribuyentes, usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const estadoProcesoValues = [
  "pendiente",
  "asignado",
  "en_contacto",
  "notificado",
  "en_negociacion",
  "cobrado",
  "incobrable",
  "en_cobro_coactivo",
  "suspendido",
] as const;

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
});

const schemaActualizar = schemaCrear.extend({
  id: z.number().int().positive(),
});

export type EstadoFormProceso = {
  error?: string;
  errores?: Record<string, string[]>;
};

/** Returns ISO date string (YYYY-MM-DD) for PostgreSQL date column, or null. */
function parseFechaLimite(value: string | undefined): string | null {
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
    estadoActual,
    asignadoAId,
    fechaLimite,
  } = parsed.data;

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
        fechaLimite: parseFechaLimite(fechaLimite),
      })
      .returning({ id: procesos.id });

    if (!inserted) throw new Error("No se pudo crear el proceso");
    await db.insert(historialProceso).values({
      procesoId: inserted.id,
      tipoEvento: "cambio_estado",
      estadoNuevo: estadoActual,
      comentario: "Proceso creado",
    });
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
  } = parsed.data;

  try {
    const [existing] = await db
      .select({ estadoActual: procesos.estadoActual, asignadoAId: procesos.asignadoAId })
      .from(procesos)
      .where(eq(procesos.id, parsed.data.id));
    if (!existing) return { error: "Proceso no encontrado." };

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
        fechaLimite: parseFechaLimite(fechaLimite),
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
