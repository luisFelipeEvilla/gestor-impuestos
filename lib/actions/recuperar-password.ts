"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hash } from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { enviarEmailRecuperacionPassword } from "@/lib/notificaciones/resend";

const EXPIRACION_HORAS = 1;
const TOKEN_BYTES = 32;

const schemaSolicitar = z.object({
  email: z.string().email("Email no válido").transform((s) => s.trim().toLowerCase()),
});

const schemaRestablecer = z.object({
  token: z.string().min(1, "Enlace inválido o expirado"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type ResultadoSolicitar = {
  ok: boolean;
  mensaje: string;
};

/**
 * Genera un token seguro y su hash SHA-256 para guardar en BD.
 * El token en claro se envía por email; en BD solo guardamos el hash.
 */
function generarTokenYHash(): { token: string; tokenHash: string } {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export async function solicitarRecuperacionPassword(
  _prev: ResultadoSolicitar | null,
  formData: FormData
): Promise<ResultadoSolicitar> {
  const raw = { email: formData.get("email") };
  const parsed = schemaSolicitar.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.email?.[0] ?? "Email no válido.";
    return { ok: false, mensaje: msg };
  }

  const email = parsed.data.email;

  const [user] = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre })
    .from(usuarios)
    .where(and(eq(usuarios.email, email), eq(usuarios.activo, true)))
    .limit(1);

  // Siempre devolver el mismo mensaje para no revelar si el email existe (evitar enumeración).
  const mensajeExito =
    "Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña en unos minutos. Revisa también la carpeta de spam.";

  if (!user) {
    return { ok: true, mensaje: mensajeExito };
  }

  const { token, tokenHash } = generarTokenYHash();
  const expiresAt = new Date(Date.now() + EXPIRACION_HORAS * 60 * 60 * 1000);

  await db
    .update(usuarios)
    .set({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(usuarios.id, user.id));

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl.replace(/\/$/, "")}/recuperar-password/restablecer?token=${encodeURIComponent(token)}`;

  const resultado = await enviarEmailRecuperacionPassword(email, {
    nombre: user.nombre,
    resetUrl,
  });

  if (!resultado.ok) {
    console.error("[recuperar-password] Error enviando email:", resultado.error);
    return {
      ok: false,
      mensaje: "No pudimos enviar el correo. Intenta de nuevo más tarde.",
    };
  }

  return { ok: true, mensaje: mensajeExito };
}

export type ResultadoRestablecer = {
  ok: boolean;
  mensaje: string;
  errores?: Record<string, string[]>;
};

function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function restablecerPassword(
  _prev: ResultadoRestablecer | null,
  formData: FormData
): Promise<ResultadoRestablecer> {
  const tokenRaw = formData.get("token");
  const token = typeof tokenRaw === "string" ? tokenRaw.trim() : "";
  const raw = {
    token,
    password: formData.get("password"),
  };

  const parsed = schemaRestablecer.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const errores = flat.fieldErrors as Record<string, string[] | undefined>;
    return {
      ok: false,
      mensaje: flat.formErrors.join(" ") || "Datos inválidos",
      errores: Object.keys(errores).length ? (errores as Record<string, string[]>) : undefined,
    };
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const now = new Date();

  const [user] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.passwordResetTokenHash, tokenHash),
        gt(usuarios.passwordResetExpiresAt, now)
      )
    )
    .limit(1);

  if (!user) {
    return {
      ok: false,
      mensaje: "El enlace ha expirado o no es válido. Solicita uno nuevo desde la página de recuperación.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db
    .update(usuarios)
    .set({
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(usuarios.id, user.id));

  redirect("/login?restablecido=1");
}
