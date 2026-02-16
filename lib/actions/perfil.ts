"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";

const schemaPerfil = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(200),
  email: z.string().email("Email no válido"),
});

export interface EstadoFormPerfil {
  error?: string;
  errores?: Record<string, string[]>;
}

function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

/**
 * Actualiza el perfil del usuario autenticado. Solo permite modificar nombre y email.
 * El cargo solo puede cambiarlo un administrador desde Gestión de usuarios.
 */
const schemaCambiarContraseña = z
  .object({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    passwordConfirm: z.string().min(1, "Confirma la contraseña"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirm"],
  });

export interface EstadoFormCambiarContraseña {
  error?: string;
  errores?: Record<string, string[]>;
}

/**
 * Cambia la contraseña del usuario autenticado.
 */
export async function cambiarContraseña(
  _prev: EstadoFormCambiarContraseña | null,
  formData: FormData
): Promise<EstadoFormCambiarContraseña> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Debes iniciar sesión." };

  const raw = {
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  };

  const parsed = schemaCambiarContraseña.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const errores = flat.fieldErrors as Record<string, string[] | undefined>;
    return {
      error: flat.formErrors.join(" ") || "Datos inválidos",
      errores: Object.keys(errores).length ? (errores as Record<string, string[]>) : undefined,
    };
  }

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId) || userId < 1) return { error: "Sesión inválida." };

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    const [updated] = await db
      .update(usuarios)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(usuarios.id, userId))
      .returning({ id: usuarios.id });

    if (!updated) return { error: "No se pudo actualizar la contraseña." };
    revalidatePath("/perfil");
    return {};
  } catch (err) {
    console.error(err);
    return { error: "Error al cambiar la contraseña. Intenta de nuevo." };
  }
}

export async function actualizarPerfil(
  _prev: EstadoFormPerfil | null,
  formData: FormData
): Promise<EstadoFormPerfil> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Debes iniciar sesión para actualizar tu perfil." };

  const raw = {
    nombre: formData.get("nombre"),
    email: formData.get("email"),
  };

  const parsed = schemaPerfil.safeParse(raw);

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const errores = flat.fieldErrors as Record<string, string[] | undefined>;
    return {
      error: flat.formErrors.join(" ") || "Datos inválidos",
      errores: Object.keys(errores).length ? (errores as Record<string, string[]>) : undefined,
    };
  }

  const { nombre, email } = parsed.data;

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId) || userId < 1) return { error: "Sesión inválida." };

  try {
    const [updated] = await db
      .update(usuarios)
      .set({
        nombre,
        email: email.trim().toLowerCase(),
        updatedAt: new Date(),
      })
      .where(eq(usuarios.id, userId))
      .returning({ id: usuarios.id });

    if (!updated) return { error: "No se pudo actualizar el perfil." };

    revalidatePath("/perfil");
    revalidatePath("/");
    return {};
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      return { error: "Ya existe un usuario con ese email.", errores: { email: ["Email duplicado"] } };
    }
    console.error(err);
    return { error: "Error al actualizar el perfil. Intenta de nuevo." };
  }
}
