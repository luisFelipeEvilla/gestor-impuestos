import { Resend } from "resend";
import { renderTemplateNotificacionCobro, type DatosNotificacionCobro } from "./template-notificacion-cobro";
import { renderTemplateActa, type DatosEmailActa } from "./template-acta";
import { renderTemplateRecuperacionPassword, type DatosEmailRecuperacionPassword } from "./template-recuperacion-password";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.NOTIFICACION_FROM_EMAIL ?? "onboarding@resend.dev";
const FROM_NAME = process.env.NOTIFICACION_FROM_NAME ?? "Gestor de Impuestos";

export type ResultadoEnvioEmail = {
  ok: true;
  resendId: string;
} | {
  ok: false;
  error: string;
};

const SUBJECT = "Notificación de cobro – Gestor de Impuestos";

/**
 * Envía por Resend la notificación de cobro al contribuyente.
 * Requiere RESEND_API_KEY en el entorno.
 */
export async function enviarNotificacionCobroPorEmail(
  to: string,
  datos: DatosNotificacionCobro
): Promise<ResultadoEnvioEmail> {
  if (!RESEND_API_KEY || RESEND_API_KEY.trim() === "") {
    return { ok: false, error: "RESEND_API_KEY no configurada." };
  }

  to = 'levilla@appworks.com.co'

  const trimmedTo = to.trim();
  if (!trimmedTo) {
    return { ok: false, error: "El correo del destinatario es obligatorio." };
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    const html = renderTemplateNotificacionCobro(datos);

    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: trimmedTo,
      subject: SUBJECT,
      html,
    });

    if (error) {
      return {
        ok: false,
        error: error.message ?? "Error al enviar el correo.",
      };
    }

    if (!data?.id) {
      return {
        ok: false,
        error: "Resend no devolvió ID del envío.",
      };
    }

    return { ok: true, resendId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado al enviar el correo.";
    return { ok: false, error: message };
  }
}

const SUBJECT_ACTA_BASE = "Acta de reunión – Gestor de Impuestos";

/**
 * Envía por Resend el acta de reunión al destinatario.
 * Requiere RESEND_API_KEY en el entorno.
 * @param options.bcc - Correos en copia oculta (ej. gerencia, admin) para dejar evidencia del envío.
 */
export async function enviarActaPorEmail(
  to: string,
  datos: DatosEmailActa,
  options?: { bcc?: string | string[] }
): Promise<ResultadoEnvioEmail> {
  if (!RESEND_API_KEY || RESEND_API_KEY.trim() === "") {
    return { ok: false, error: "RESEND_API_KEY no configurada." };
  }

  const trimmedTo = to.trim();
  if (!trimmedTo) {
    return { ok: false, error: "El correo del destinatario es obligatorio." };
  }

  const bcc = options?.bcc
    ? Array.isArray(options.bcc)
      ? options.bcc.filter((e) => e?.trim()).map((e) => e!.trim())
      : [options.bcc.trim()]
    : undefined;

  const subject =
    datos.numeroActa != null
      ? `Acta de reunión #${datos.numeroActa} – Gestor de Impuestos`
      : SUBJECT_ACTA_BASE;

  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const resend = new Resend(RESEND_API_KEY);
    const html = renderTemplateActa(datos, baseUrl);

    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: trimmedTo,
      subject,
      html,
      ...(bcc && bcc.length > 0 && { bcc }),
    });

    if (error) {
      return {
        ok: false,
        error: error.message ?? "Error al enviar el correo.",
      };
    }

    if (!data?.id) {
      return {
        ok: false,
        error: "Resend no devolvió ID del envío.",
      };
    }

    return { ok: true, resendId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado al enviar el correo.";
    return { ok: false, error: message };
  }
}

const SUBJECT_RECUPERACION = "Recuperar contraseña – Gestor de Impuestos";

/**
 * Envía por Resend el email con el enlace para restablecer la contraseña.
 * Requiere RESEND_API_KEY en el entorno.
 */
export async function enviarEmailRecuperacionPassword(
  to: string,
  datos: DatosEmailRecuperacionPassword
): Promise<ResultadoEnvioEmail> {
  if (!RESEND_API_KEY || RESEND_API_KEY.trim() === "") {
    return { ok: false, error: "RESEND_API_KEY no configurada." };
  }

  const trimmedTo = to.trim();
  if (!trimmedTo) {
    return { ok: false, error: "El correo del destinatario es obligatorio." };
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    const html = renderTemplateRecuperacionPassword(datos);

    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: trimmedTo,
      subject: SUBJECT_RECUPERACION,
      html,
    });

    if (error) {
      return {
        ok: false,
        error: error.message ?? "Error al enviar el correo.",
      };
    }

    if (!data?.id) {
      return {
        ok: false,
        error: "Resend no devolvió ID del envío.",
      };
    }

    return { ok: true, resendId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado al enviar el correo.";
    return { ok: false, error: message };
  }
}

export type EvidenciaEnvioEmail = {
  canal: "email";
  to: string;
  subject: string;
  resendId: string;
  sentAt: string;
  templateId: string;
  /** HTML del cuerpo del correo enviado, para mostrar en la UI. */
  bodyHtml?: string;
};

/** Arma el objeto de evidencia para guardar en metadata del historial. */
export function crearEvidenciaEnvio(
  to: string,
  resendId: string,
  templateId: string = "notificacion-cobro",
  bodyHtml?: string
): EvidenciaEnvioEmail {
  return {
    canal: "email",
    to,
    subject: SUBJECT,
    resendId,
    sentAt: new Date().toISOString(),
    templateId,
    ...(bodyHtml != null && bodyHtml !== "" ? { bodyHtml } : {}),
  };
}
