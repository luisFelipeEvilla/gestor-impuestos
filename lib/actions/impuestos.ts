"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { impuestos, historialImpuesto } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";

const TIPOS_PERIODO = ["bimestral", "trimestral", "semestral", "anual"] as const;
const ESTADOS = [
  "pendiente",
  "declarado",
  "liquidado",
  "notificado",
  "en_cobro_coactivo",
  "pagado",
  "cerrado",
] as const;

const schemaCrear = z.object({
  contribuyenteId: z.coerce.number().int().positive("Selecciona un contribuyente"),
  tipoImpuesto: z.string().min(1, "El tipo de impuesto es obligatorio").max(200),
  vigencia: z.coerce.number().int().min(1900).max(2100),
  tipoPeriodo: z.enum(TIPOS_PERIODO),
  periodo: z.string().max(20).optional().or(z.literal("")),
  baseGravable: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : String(v))),
  tarifa: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : String(v))),
  impuestoDeterminado: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : String(v))),
  intereses: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? "0" : String(v))),
  sanciones: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? "0" : String(v))),
  descuentos: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? "0" : String(v))),
  totalAPagar: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : String(v))),
  fechaVencimiento: z.string().optional().or(z.literal("")),
  fechaDeclaracion: z.string().optional().or(z.literal("")),
  noExpediente: z.string().max(100).optional().or(z.literal("")),
  observaciones: z.string().max(1000).optional().or(z.literal("")),
});

const schemaActualizar = schemaCrear.extend({
  id: z.string().uuid("ID de impuesto inválido"),
});

const schemaEstado = z.object({
  id: z.string().uuid(),
  estado: z.enum(ESTADOS),
  comentario: z.string().max(500).optional().or(z.literal("")),
});

export type EstadoFormImpuesto = {
  error?: string;
  errores?: Record<string, string[]>;
};

function buildValues(data: z.infer<typeof schemaCrear>) {
  return {
    contribuyenteId: data.contribuyenteId,
    tipoImpuesto: data.tipoImpuesto.trim(),
    vigencia: data.vigencia,
    tipoPeriodo: data.tipoPeriodo,
    periodo: data.periodo?.trim() || null,
    baseGravable: data.baseGravable ?? null,
    tarifa: data.tarifa ?? null,
    impuestoDeterminado: data.impuestoDeterminado ?? null,
    intereses: data.intereses ?? "0",
    sanciones: data.sanciones ?? "0",
    descuentos: data.descuentos ?? "0",
    totalAPagar: data.totalAPagar ?? null,
    fechaVencimiento: data.fechaVencimiento || null,
    fechaDeclaracion: data.fechaDeclaracion || null,
    noExpediente: data.noExpediente?.trim() || null,
    observaciones: data.observaciones?.trim() || null,
  };
}

function rawFromForm(formData: FormData) {
  return {
    contribuyenteId: formData.get("contribuyenteId"),
    tipoImpuesto: formData.get("tipoImpuesto"),
    vigencia: formData.get("vigencia"),
    tipoPeriodo: formData.get("tipoPeriodo"),
    periodo: formData.get("periodo") || undefined,
    baseGravable: formData.get("baseGravable") || undefined,
    tarifa: formData.get("tarifa") || undefined,
    impuestoDeterminado: formData.get("impuestoDeterminado") || undefined,
    intereses: formData.get("intereses") || undefined,
    sanciones: formData.get("sanciones") || undefined,
    descuentos: formData.get("descuentos") || undefined,
    totalAPagar: formData.get("totalAPagar") || undefined,
    fechaVencimiento: formData.get("fechaVencimiento") || undefined,
    fechaDeclaracion: formData.get("fechaDeclaracion") || undefined,
    noExpediente: formData.get("noExpediente") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  };
}

function isRedirectError(err: unknown): boolean {
  return (
    err != null &&
    typeof err === "object" &&
    "digest" in err &&
    typeof (err as { digest?: string }).digest === "string"
  );
}

export async function crearImpuesto(
  _prev: EstadoFormImpuesto | null,
  formData: FormData
): Promise<EstadoFormImpuesto> {
  const parsed = schemaCrear.safeParse(rawFromForm(formData));
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      error: flat.formErrors.join(" ") || "Datos inválidos",
      errores: flat.fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [inserted] = await db
      .insert(impuestos)
      .values(buildValues(parsed.data))
      .returning({ id: impuestos.id });

    if (!inserted) throw new Error("No se pudo crear el impuesto");
    revalidatePath("/impuestos");
    redirect(`/impuestos/${inserted.id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error(err);
    return { error: "Error al crear el impuesto. Intenta de nuevo." };
  }
}

export async function actualizarImpuesto(
  _prev: EstadoFormImpuesto | null,
  formData: FormData
): Promise<EstadoFormImpuesto> {
  const idRaw = String(formData.get("id") ?? "").trim();
  const parsed = schemaActualizar.safeParse({ id: idRaw, ...rawFromForm(formData) });
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      error: flat.formErrors.join(" ") || "Datos inválidos",
      errores: flat.fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [updated] = await db
      .update(impuestos)
      .set({ ...buildValues(parsed.data), actualizadoEn: new Date() })
      .where(eq(impuestos.id, parsed.data.id))
      .returning({ id: impuestos.id });

    if (!updated) return { error: "Impuesto no encontrado." };
    revalidatePath("/impuestos");
    revalidatePath(`/impuestos/${parsed.data.id}`);
    revalidatePath(`/impuestos/${parsed.data.id}/editar`);
    redirect(`/impuestos/${updated.id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error(err);
    return { error: "Error al actualizar el impuesto. Intenta de nuevo." };
  }
}

export async function cambiarEstadoImpuesto(
  formData: FormData
): Promise<EstadoFormImpuesto> {
  const session = await getSession();
  if (!session?.user) return { error: "No autenticado." };

  const parsed = schemaEstado.safeParse({
    id: formData.get("id"),
    estado: formData.get("estado"),
    comentario: formData.get("comentario") || undefined,
  });
  if (!parsed.success) return { error: "Datos inválidos." };

  const { id, estado, comentario } = parsed.data;

  try {
    const [current] = await db
      .select({ estadoActual: impuestos.estadoActual })
      .from(impuestos)
      .where(eq(impuestos.id, id));

    if (!current) return { error: "Impuesto no encontrado." };

    await db
      .update(impuestos)
      .set({ estadoActual: estado, actualizadoEn: new Date() })
      .where(eq(impuestos.id, id));

    await db.insert(historialImpuesto).values({
      impuestoId: id,
      usuarioId: Number(session.user.id),
      tipoEvento: "cambio_estado",
      estadoAnterior: current.estadoActual,
      estadoNuevo: estado,
      comentario: comentario?.trim() || null,
    });

    revalidatePath(`/impuestos/${id}`);
    revalidatePath("/impuestos");
    return {};
  } catch (err) {
    console.error(err);
    return { error: "Error al cambiar el estado." };
  }
}

export async function agregarNotaImpuesto(
  formData: FormData
): Promise<EstadoFormImpuesto> {
  const session = await getSession();
  if (!session?.user) return { error: "No autenticado." };

  const id = String(formData.get("id") ?? "").trim();
  const comentario = String(formData.get("comentario") ?? "").trim();

  if (!z.string().uuid().safeParse(id).success) return { error: "ID inválido." };
  if (!comentario) return { error: "La nota no puede estar vacía." };

  try {
    await db.insert(historialImpuesto).values({
      impuestoId: id,
      usuarioId: Number(session.user.id),
      tipoEvento: "nota",
      comentario,
    });

    revalidatePath(`/impuestos/${id}`);
    return {};
  } catch (err) {
    console.error(err);
    return { error: "Error al guardar la nota." };
  }
}

export async function eliminarImpuesto(formData: FormData): Promise<EstadoFormImpuesto> {
  const id = String(formData.get("id") ?? "").trim();
  if (!z.string().uuid().safeParse(id).success) return { error: "ID inválido." };

  try {
    const [deleted] = await db
      .delete(impuestos)
      .where(eq(impuestos.id, id))
      .returning({ id: impuestos.id });

    if (!deleted) return { error: "Impuesto no encontrado." };
    revalidatePath("/impuestos");
    redirect("/impuestos");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    if (
      err != null &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "23503"
    ) {
      return { error: "No se puede eliminar: existen registros asociados." };
    }
    console.error(err);
    return { error: "Error al eliminar el impuesto." };
  }
}
