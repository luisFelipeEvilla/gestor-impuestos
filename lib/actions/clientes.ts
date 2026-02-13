"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientes } from "@/lib/db/schema";
import { eq, and, ilike, desc } from "drizzle-orm";

const schemaCrear = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(200),
  codigo: z.string().max(50).optional().or(z.literal("")),
  descripcion: z.string().max(500).optional().or(z.literal("")),
  emailContacto: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.string().email("Correo de contacto inválido").optional()
  ),
  nombreContacto: z.string().max(200).optional().or(z.literal("")),
  activo: z.boolean().default(true),
});

const schemaActualizar = schemaCrear.extend({
  id: z.number().int().positive(),
});

export type EstadoFormCliente = {
  error?: string;
  errores?: Record<string, string[]>;
};

export async function crearCliente(
  _prev: EstadoFormCliente | null,
  formData: FormData
): Promise<EstadoFormCliente> {
  const raw = {
    nombre: formData.get("nombre"),
    codigo: formData.get("codigo") || undefined,
    descripcion: formData.get("descripcion") || undefined,
    emailContacto: formData.get("emailContacto") || undefined,
    nombreContacto: formData.get("nombreContacto") || undefined,
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

  const { nombre, codigo, descripcion, emailContacto, nombreContacto, activo } = parsed.data;

  try {
    const [inserted] = await db
      .insert(clientes)
      .values({
        nombre: nombre.trim(),
        codigo: codigo?.trim() || null,
        descripcion: descripcion?.trim() || null,
        emailContacto: emailContacto?.trim() || null,
        nombreContacto: nombreContacto?.trim() || null,
        activo,
      })
      .returning({ id: clientes.id });

    if (!inserted) throw new Error("No se pudo crear el cliente");
    revalidatePath("/clientes");
    revalidatePath("/impuestos");
    revalidatePath("/actas");
    redirect(`/clientes/${inserted.id}`);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      return { error: "Ya existe un cliente con ese código.", errores: { codigo: ["Código duplicado"] } };
    }
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string"
    ) {
      throw err;
    }
    console.error(err);
    return { error: "Error al crear el cliente. Intenta de nuevo." };
  }
}

export async function actualizarCliente(
  _prev: EstadoFormCliente | null,
  formData: FormData
): Promise<EstadoFormCliente> {
  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" ? parseInt(idRaw, 10) : Number(idRaw);
  const raw = {
    id: Number.isNaN(id) ? undefined : id,
    nombre: formData.get("nombre"),
    codigo: formData.get("codigo") || undefined,
    descripcion: formData.get("descripcion") || undefined,
    emailContacto: formData.get("emailContacto") || undefined,
    nombreContacto: formData.get("nombreContacto") || undefined,
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

  const { nombre, codigo, descripcion, emailContacto, nombreContacto, activo } = parsed.data;

  try {
    const [updated] = await db
      .update(clientes)
      .set({
        nombre: nombre.trim(),
        codigo: codigo?.trim() || null,
        descripcion: descripcion?.trim() || null,
        emailContacto: emailContacto?.trim() || null,
        nombreContacto: nombreContacto?.trim() || null,
        activo,
        updatedAt: new Date(),
      })
      .where(eq(clientes.id, parsed.data.id))
      .returning({ id: clientes.id });

    if (!updated) return { error: "Cliente no encontrado." };
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${parsed.data.id}`);
    revalidatePath("/impuestos");
    revalidatePath("/actas");
    redirect(`/clientes/${updated.id}`);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      return { error: "Ya existe un cliente con ese código.", errores: { codigo: ["Código duplicado"] } };
    }
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string"
    ) {
      throw err;
    }
    console.error(err);
    return { error: "Error al actualizar el cliente. Intenta de nuevo." };
  }
}

export async function obtenerClientesActivos(): Promise<{ id: number; nombre: string; codigo: string | null }[]> {
  const rows = await db
    .select({ id: clientes.id, nombre: clientes.nombre, codigo: clientes.codigo })
    .from(clientes)
    .where(eq(clientes.activo, true))
    .orderBy(clientes.nombre);
  return rows;
}

export async function obtenerClientes(filtros?: {
  inactivos?: boolean;
  q?: string;
}): Promise<{ id: number; nombre: string; codigo: string | null; activo: boolean }[]> {
  const condiciones = [];
  if (!filtros?.inactivos) condiciones.push(eq(clientes.activo, true));
  if (filtros?.q?.trim()) {
    condiciones.push(ilike(clientes.nombre, `%${filtros.q.trim()}%`));
  }
  const whereCond = condiciones.length > 0 ? and(...condiciones) : undefined;
  const rows = await (whereCond
    ? db.select().from(clientes).where(whereCond)
    : db.select().from(clientes)
  )
    .orderBy(desc(clientes.createdAt));
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    codigo: r.codigo,
    activo: r.activo,
  }));
}
