"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { impuestos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const tipoImpuestoValues = ["nacional", "municipal"] as const;

const schemaCrear = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(200),
  codigo: z.string().min(1, "El código es obligatorio").max(50),
  tipo: z.enum(tipoImpuestoValues),
  descripcion: z.string().max(500).optional().or(z.literal("")),
  activo: z.boolean().default(true),
});

const schemaActualizar = schemaCrear.extend({
  id: z.number().int().positive(),
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
    nombre: formData.get("nombre"),
    codigo: formData.get("codigo"),
    tipo: formData.get("tipo"),
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

  const { nombre, codigo, tipo, descripcion, activo } = parsed.data;

  try {
    const [inserted] = await db
      .insert(impuestos)
      .values({
        nombre,
        codigo: codigo.trim(),
        tipo,
        descripcion: descripcion?.trim() || null,
        activo,
      })
      .returning({ id: impuestos.id });

    if (!inserted) throw new Error("No se pudo crear el impuesto");
    revalidatePath("/impuestos");
    revalidatePath("/");
    redirect(`/impuestos/${inserted.id}`);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      return { error: "Ya existe un impuesto con ese código.", errores: { codigo: ["Código duplicado"] } };
    }
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
  const id = typeof idRaw === "string" ? parseInt(idRaw, 10) : Number(idRaw);
  const raw = {
    id: Number.isNaN(id) ? undefined : id,
    nombre: formData.get("nombre"),
    codigo: formData.get("codigo"),
    tipo: formData.get("tipo"),
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

  const { nombre, codigo, tipo, descripcion, activo } = parsed.data;

  try {
    const [updated] = await db
      .update(impuestos)
      .set({
        nombre,
        codigo: codigo.trim(),
        tipo,
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
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      return { error: "Ya existe un impuesto con ese código.", errores: { codigo: ["Código duplicado"] } };
    }
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al actualizar el impuesto. Intenta de nuevo." };
  }
}

export async function desactivarImpuesto(formData: FormData): Promise<EstadoFormImpuesto> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "ID inválido." };
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
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "ID inválido." };
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
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "ID inválido." };
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
