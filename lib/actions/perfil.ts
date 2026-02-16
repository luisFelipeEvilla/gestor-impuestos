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
  password: z.string().min(6).optional().or(z.literal("")),
  cargoId: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v))),
});

export interface EstadoFormPerfil {
  error?: string;
  errores?: Record<string, string[]>;
}

function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

/**
 * Actualiza el perfil del usuario autenticado. Solo permite modificar
 * nombre, email, cargo y contraseña (opcional). No permite cambiar rol ni activo.
 */
export async function actualizarPerfil(
  _prev: EstadoFormPerfil | null,
  formData: FormData
): Promise<EstadoFormPerfil> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Debes iniciar sesión para actualizar tu perfil." };

  const raw = {
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    password: formData.get("password"),
    cargoId: formData.get("cargoId"),
  };

  const passwordRaw = raw.password;
  const parsed = schemaPerfil.safeParse({
    ...raw,
    password: typeof passwordRaw === "string" && passwordRaw.length > 0 ? passwordRaw : "",
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const errores = flat.fieldErrors as Record<string, string[] | undefined>;
    return {
      error: flat.formErrors.join(" ") || "Datos inválidos",
      errores: Object.keys(errores).length ? (errores as Record<string, string[]>) : undefined,
    };
  }

  const { nombre, email, cargoId } = parsed.data;
  const password =
    parsed.data.password && String(parsed.data.password).length >= 6
      ? parsed.data.password
      : null;

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId) || userId < 1) return { error: "Sesión inválida." };

  try {
    const updateData: {
      nombre: string;
      email: string;
      cargoId: number | null;
      updatedAt: Date;
      passwordHash?: string;
    } = {
      nombre,
      email: email.trim().toLowerCase(),
      cargoId: cargoId ?? null,
      updatedAt: new Date(),
    };
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const [updated] = await db
      .update(usuarios)
      .set(updateData)
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
