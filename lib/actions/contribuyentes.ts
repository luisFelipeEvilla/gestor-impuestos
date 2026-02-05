"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { contribuyentes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const tipoDocumentoValues = ["nit", "cedula"] as const;

const schemaCrear = z.object({
  nit: z.string().min(1, "El NIT o documento es obligatorio").max(20),
  tipoDocumento: z.enum(tipoDocumentoValues).default("nit"),
  nombreRazonSocial: z.string().min(1, "El nombre o razón social es obligatorio").max(300),
  telefono: z.string().max(30).optional().or(z.literal("")),
  email: z
    .string()
    .max(100)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || v.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Email no válido"),
  direccion: z.string().max(200).optional().or(z.literal("")),
  ciudad: z.string().max(100).optional().or(z.literal("")),
  departamento: z.string().max(100).optional().or(z.literal("")),
});

const schemaActualizar = schemaCrear.extend({
  id: z.number().int().positive(),
});

export type EstadoFormContribuyente = {
  error?: string;
  errores?: Record<string, string[]>;
};

function trimOptional(value: string | undefined): string | null {
  if (value === undefined || value === null) return null;
  const t = value.trim();
  return t === "" ? null : t;
}

export async function crearContribuyente(
  _prev: EstadoFormContribuyente | null,
  formData: FormData
): Promise<EstadoFormContribuyente> {
  const raw = {
    nit: formData.get("nit"),
    tipoDocumento: formData.get("tipoDocumento") || "nit",
    nombreRazonSocial: formData.get("nombreRazonSocial"),
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email") || undefined,
    direccion: formData.get("direccion") || undefined,
    ciudad: formData.get("ciudad") || undefined,
    departamento: formData.get("departamento") || undefined,
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
    nit,
    tipoDocumento,
    nombreRazonSocial,
    telefono,
    email,
    direccion,
    ciudad,
    departamento,
  } = parsed.data;

  try {
    const [inserted] = await db
      .insert(contribuyentes)
      .values({
        nit: nit.trim(),
        tipoDocumento,
        nombreRazonSocial: nombreRazonSocial.trim(),
        telefono: trimOptional(telefono),
        email: trimOptional(email),
        direccion: trimOptional(direccion),
        ciudad: trimOptional(ciudad),
        departamento: trimOptional(departamento),
      })
      .returning({ id: contribuyentes.id });

    if (!inserted) throw new Error("No se pudo crear el contribuyente");
    revalidatePath("/contribuyentes");
    revalidatePath("/");
    revalidatePath("/procesos");
    redirect(`/contribuyentes/${inserted.id}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al crear el contribuyente. Intenta de nuevo." };
  }
}

export async function actualizarContribuyente(
  _prev: EstadoFormContribuyente | null,
  formData: FormData
): Promise<EstadoFormContribuyente> {
  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" ? parseInt(idRaw, 10) : Number(idRaw);
  const raw = {
    id: Number.isNaN(id) ? undefined : id,
    nit: formData.get("nit"),
    tipoDocumento: formData.get("tipoDocumento") || "nit",
    nombreRazonSocial: formData.get("nombreRazonSocial"),
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email") || undefined,
    direccion: formData.get("direccion") || undefined,
    ciudad: formData.get("ciudad") || undefined,
    departamento: formData.get("departamento") || undefined,
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
    nit,
    tipoDocumento,
    nombreRazonSocial,
    telefono,
    email,
    direccion,
    ciudad,
    departamento,
  } = parsed.data;

  try {
    const [updated] = await db
      .update(contribuyentes)
      .set({
        nit: nit.trim(),
        tipoDocumento,
        nombreRazonSocial: nombreRazonSocial.trim(),
        telefono: trimOptional(telefono),
        email: trimOptional(email),
        direccion: trimOptional(direccion),
        ciudad: trimOptional(ciudad),
        departamento: trimOptional(departamento),
        updatedAt: new Date(),
      })
      .where(eq(contribuyentes.id, parsed.data.id))
      .returning({ id: contribuyentes.id });

    if (!updated) return { error: "Contribuyente no encontrado." };
    revalidatePath("/contribuyentes");
    revalidatePath(`/contribuyentes/${parsed.data.id}`);
    revalidatePath(`/contribuyentes/${parsed.data.id}/editar`);
    revalidatePath("/");
    revalidatePath("/procesos");
    redirect(`/contribuyentes/${updated.id}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al actualizar el contribuyente. Intenta de nuevo." };
  }
}

export async function eliminarContribuyente(formData: FormData): Promise<EstadoFormContribuyente> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "ID inválido." };
  try {
    const [deleted] = await db
      .delete(contribuyentes)
      .where(eq(contribuyentes.id, id))
      .returning({ id: contribuyentes.id });
    if (!deleted) return { error: "Contribuyente no encontrado." };
    revalidatePath("/contribuyentes");
    revalidatePath("/");
    revalidatePath("/procesos");
    redirect("/contribuyentes");
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "23503") {
      return { error: "No se puede eliminar: hay procesos de cobro asociados a este contribuyente." };
    }
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al eliminar el contribuyente." };
  }
}
