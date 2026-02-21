"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { impuestos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const naturalezaImpuestoValues = ["tributario", "no_tributario"] as const;

const schemaCrear = z.object({
  clienteId: z.coerce.number().int().positive("Selecciona un cliente"),
  nombre: z.string().min(1, "El nombre es obligatorio").max(200),
  naturaleza: z.enum(naturalezaImpuestoValues),
  prescripcionMeses: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return null;
      const n = typeof v === "number" ? v : parseInt(String(v), 10);
      return Number.isInteger(n) && n > 0 ? n : null;
    }),
  descripcion: z.string().max(500).optional().or(z.literal("")),
  activo: z.boolean().default(true),
});

const schemaActualizar = schemaCrear.extend({
  id: z.string().uuid("ID de impuesto inválido"),
}).extend({
  clienteId: z.coerce.number().int().positive().optional().nullable(),
});

export type EstadoFormImpuesto = {
  error?: string;
  errores?: Record<string, string[]>;
};

export async function crearImpuesto(
  _prev: EstadoFormImpuesto | null,
  formData: FormData
): Promise<EstadoFormImpuesto> {
  const raw = {
    clienteId: formData.get("clienteId"),
    nombre: formData.get("nombre"),
    naturaleza: formData.get("naturaleza"),
    prescripcionMeses: formData.get("prescripcionMeses"),
    descripcion: formData.get("descripcion") || undefined,
    activo: formData.get("activo") === "on",
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

  const { clienteId, nombre, naturaleza, prescripcionMeses, descripcion, activo } = parsed.data;

  try {
    const [inserted] = await db
      .insert(impuestos)
      .values({
        clienteId,
        nombre,
        naturaleza,
        prescripcionMeses,
        descripcion: descripcion?.trim() || null,
        activo,
      })
      .returning({ id: impuestos.id });

    if (!inserted) throw new Error("No se pudo crear el impuesto");
    revalidatePath("/impuestos");
    revalidatePath("/");
    redirect(`/impuestos/${inserted.id}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al crear el impuesto. Intenta de nuevo." };
  }
}

export async function actualizarImpuesto(
  _prev: EstadoFormImpuesto | null,
  formData: FormData
): Promise<EstadoFormImpuesto> {
  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" ? idRaw.trim() : String(idRaw ?? "");
  const raw = {
    id: id || undefined,
    clienteId: formData.get("clienteId"),
    nombre: formData.get("nombre"),
    naturaleza: formData.get("naturaleza"),
    prescripcionMeses: formData.get("prescripcionMeses"),
    descripcion: formData.get("descripcion") || undefined,
    activo: formData.get("activo") === "on",
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

  const { clienteId, nombre, naturaleza, prescripcionMeses, descripcion, activo } = parsed.data;

  try {
    const [updated] = await db
      .update(impuestos)
      .set({
        clienteId: clienteId ?? null,
        nombre,
        naturaleza,
        prescripcionMeses,
        descripcion: descripcion?.trim() || null,
        activo,
        updatedAt: new Date(),
      })
      .where(eq(impuestos.id, parsed.data.id))
      .returning({ id: impuestos.id });

    if (!updated) {
      return { error: "Impuesto no encontrado." };
    }
    revalidatePath("/impuestos");
    revalidatePath(`/impuestos/${parsed.data.id}`);
    revalidatePath(`/impuestos/${parsed.data.id}/editar`);
    revalidatePath("/");
    redirect(`/impuestos/${updated.id}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al actualizar el impuesto. Intenta de nuevo." };
  }
}

export async function desactivarImpuesto(formData: FormData): Promise<EstadoFormImpuesto> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id || !z.string().uuid().safeParse(id).success) return { error: "ID inválido." };
  try {
    const [updated] = await db
      .update(impuestos)
      .set({ activo: false, updatedAt: new Date() })
      .where(eq(impuestos.id, id))
      .returning({ id: impuestos.id });

    if (!updated) return { error: "Impuesto no encontrado." };
    revalidatePath("/impuestos");
    revalidatePath(`/impuestos/${id}`);
    revalidatePath("/");
    redirect("/impuestos?inactivos=1");
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al desactivar el impuesto." };
  }
}

export async function activarImpuesto(formData: FormData): Promise<EstadoFormImpuesto> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id || !z.string().uuid().safeParse(id).success) return { error: "ID inválido." };
  try {
    const [updated] = await db
      .update(impuestos)
      .set({ activo: true, updatedAt: new Date() })
      .where(eq(impuestos.id, id))
      .returning({ id: impuestos.id });

    if (!updated) return { error: "Impuesto no encontrado." };
    revalidatePath("/impuestos");
    revalidatePath(`/impuestos/${id}`);
    revalidatePath("/");
    redirect(`/impuestos/${id}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al activar el impuesto." };
  }
}

export async function eliminarImpuesto(formData: FormData): Promise<EstadoFormImpuesto> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id || !z.string().uuid().safeParse(id).success) return { error: "ID inválido." };
  try {
    const [deleted] = await db.delete(impuestos).where(eq(impuestos.id, id)).returning({ id: impuestos.id });
    if (!deleted) return { error: "Impuesto no encontrado." };
    revalidatePath("/impuestos");
    revalidatePath("/");
    redirect("/impuestos");
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "23503") {
      return { error: "No se puede eliminar: hay procesos de cobro que usan este impuesto." };
    }
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al eliminar el impuesto." };
  }
}
