"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminSession } from "@/lib/auth-server";

const rolValues = ["admin", "empleado"] as const;

const schemaCrear = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(200),
  email: z.string().email("Email no válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  rol: z.enum(rolValues),
  cargoId: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v))),
  activo: z.boolean().default(true),
});

const schemaActualizar = z.object({
  id: z.number().int().positive(),
  nombre: z.string().min(1, "El nombre es obligatorio").max(200),
  email: z.string().email("Email no válido"),
  password: z.string().min(6).optional().or(z.literal("")),
  rol: z.enum(rolValues),
  cargoId: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v))),
  activo: z.boolean().default(true),
});

export type EstadoFormUsuario = {
  error?: string;
  errores?: Record<string, string[]>;
};

function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function crearUsuario(
  _prev: EstadoFormUsuario | null,
  formData: FormData
): Promise<EstadoFormUsuario> {
  const session = await requireAdminSession();
  if (!session) return { error: "No tienes permiso para realizar esta acción." };

  const raw = {
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    password: formData.get("password"),
    rol: formData.get("rol"),
    cargoId: formData.get("cargoId"),
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

  const { nombre, email, password, rol, cargoId, activo } = parsed.data;

  try {
    const passwordHash = await hashPassword(password);
    const [inserted] = await db
      .insert(usuarios)
      .values({
        nombre,
        email: email.trim().toLowerCase(),
        passwordHash,
        rol,
        cargoId: cargoId ?? undefined,
        activo,
      })
      .returning({ id: usuarios.id });

    if (!inserted) throw new Error("No se pudo crear el usuario");
    revalidatePath("/usuarios");
    revalidatePath("/");
    redirect(`/usuarios/${inserted.id}`);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      return { error: "Ya existe un usuario con ese email.", errores: { email: ["Email duplicado"] } };
    }
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al crear el usuario. Intenta de nuevo." };
  }
}

export async function actualizarUsuario(
  _prev: EstadoFormUsuario | null,
  formData: FormData
): Promise<EstadoFormUsuario> {
  const session = await requireAdminSession();
  if (!session) return { error: "No tienes permiso para realizar esta acción." };

  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" ? parseInt(idRaw, 10) : Number(idRaw);
  const passwordRaw = formData.get("password");
  const raw = {
    id: Number.isNaN(id) ? undefined : id,
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    password: typeof passwordRaw === "string" && passwordRaw.length > 0 ? passwordRaw : undefined,
    rol: formData.get("rol"),
    cargoId: formData.get("cargoId"),
    activo: formData.get("activo") === "on",
  };

  const parsed = schemaActualizar.safeParse({
    ...raw,
    password: raw.password ?? "",
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const errores = flat.fieldErrors as Record<string, string[] | undefined>;
    return {
      error: flat.formErrors.join(" ") || "Datos inválidos",
      errores: Object.keys(errores).length ? (errores as Record<string, string[]>) : undefined,
    };
  }

  const { nombre, email, rol, cargoId, activo } = parsed.data;
  const password = parsed.data.password && parsed.data.password.length >= 6 ? parsed.data.password : null;

  try {
    const updateData: {
      nombre: string;
      email: string;
      rol: "admin" | "empleado";
      cargoId: number | null;
      activo: boolean;
      updatedAt: Date;
      passwordHash?: string;
    } = {
      nombre,
      email: email.trim().toLowerCase(),
      rol,
      cargoId: cargoId ?? null,
      activo,
      updatedAt: new Date(),
    };
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const [updated] = await db
      .update(usuarios)
      .set(updateData)
      .where(eq(usuarios.id, parsed.data.id))
      .returning({ id: usuarios.id });

    if (!updated) return { error: "Usuario no encontrado." };
    revalidatePath("/usuarios");
    revalidatePath(`/usuarios/${parsed.data.id}`);
    revalidatePath(`/usuarios/${parsed.data.id}/editar`);
    revalidatePath("/");
    redirect(`/usuarios/${updated.id}`);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      return { error: "Ya existe un usuario con ese email.", errores: { email: ["Email duplicado"] } };
    }
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al actualizar el usuario. Intenta de nuevo." };
  }
}

export async function desactivarUsuario(formData: FormData): Promise<EstadoFormUsuario> {
  const session = await requireAdminSession();
  if (!session) return { error: "No tienes permiso para realizar esta acción." };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "ID inválido." };
  try {
    const [updated] = await db
      .update(usuarios)
      .set({ activo: false, updatedAt: new Date() })
      .where(eq(usuarios.id, id))
      .returning({ id: usuarios.id });

    if (!updated) return { error: "Usuario no encontrado." };
    revalidatePath("/usuarios");
    revalidatePath(`/usuarios/${id}`);
    revalidatePath("/");
    redirect("/usuarios?inactivos=1");
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al desactivar el usuario." };
  }
}

export async function activarUsuario(formData: FormData): Promise<EstadoFormUsuario> {
  const session = await requireAdminSession();
  if (!session) return { error: "No tienes permiso para realizar esta acción." };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "ID inválido." };
  try {
    const [updated] = await db
      .update(usuarios)
      .set({ activo: true, updatedAt: new Date() })
      .where(eq(usuarios.id, id))
      .returning({ id: usuarios.id });

    if (!updated) return { error: "Usuario no encontrado." };
    revalidatePath("/usuarios");
    revalidatePath(`/usuarios/${id}`);
    revalidatePath("/");
    redirect(`/usuarios/${id}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al activar el usuario." };
  }
}

export async function eliminarUsuario(formData: FormData): Promise<EstadoFormUsuario> {
  const session = await requireAdminSession();
  if (!session) return { error: "No tienes permiso para realizar esta acción." };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "ID inválido." };
  try {
    const [deleted] = await db.delete(usuarios).where(eq(usuarios.id, id)).returning({ id: usuarios.id });
    if (!deleted) return { error: "Usuario no encontrado." };
    revalidatePath("/usuarios");
    revalidatePath("/");
    redirect("/usuarios");
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al eliminar el usuario." };
  }
}
