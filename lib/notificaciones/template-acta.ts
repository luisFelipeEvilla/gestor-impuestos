/**
 * Template HTML para el envío del acta de reunión por correo.
 * Incluye fecha, objetivo, contenido (sanitizado) y enlace a la app.
 */
export type DatosEmailActa = {
  nombreDestinatario: string;
  fechaActa: Date | string;
  objetivo: string;
  contenidoHtml: string;
  enlaceActa: string;
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (c) => map[c] ?? c);
}

/**
 * Elimina etiquetas HTML para mostrar solo texto seguro en el correo.
 * Permite etiquetas básicas de formato (p, strong, em, ul, ol, li, br) y escapa el resto.
 */
function sanitizeHtmlForEmail(html: string): string {
  if (!html || !html.trim()) return "";
  // Eliminar scripts y estilos
  let out = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  // Permitir solo etiquetas seguras; convertir a texto plano reemplazando <br>, </p>, etc. por newlines
  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(/<\/p>/gi, "\n");
  out = out.replace(/<\/li>/gi, "\n");
  out = out.replace(/<[^>]+>/g, "");
  out = out.replace(/&nbsp;/g, " ");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

function formatFecha(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return Number.isNaN(d.getTime())
    ? String(fecha)
    : d.toLocaleDateString("es-CO", { dateStyle: "long" });
}

export function renderTemplateActa(datos: DatosEmailActa, baseUrl: string): string {
  const fechaFormateada = escapeHtml(formatFecha(datos.fechaActa));
  const objetivoSafe = escapeHtml(datos.objetivo);
  const nombreSafe = escapeHtml(datos.nombreDestinatario);
  const contenidoTexto = sanitizeHtmlForEmail(datos.contenidoHtml);
  const contenidoSafe = escapeHtml(contenidoTexto);
  const enlaceCompleto = baseUrl.replace(/\/$/, "") + datos.enlaceActa;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acta de reunión</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 1.5rem;">Acta de reunión</h1>
    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 0.9rem;">Gestor de Impuestos</p>
  </div>
  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Estimado(a) <strong>${nombreSafe}</strong>,</p>
    <p>Se le comparte el acta de reunión con el siguiente detalle:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr style="background: #f8fafc;">
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;"><strong>Fecha</strong></td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">${fechaFormateada}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;"><strong>Objetivo</strong></td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">${objetivoSafe}</td>
      </tr>
    </table>
    ${contenidoSafe ? `<div style="margin: 16px 0; padding: 12px; background: #f8fafc; border-radius: 6px; white-space: pre-wrap;">${contenidoSafe}</div>` : ""}
    <p><a href="${escapeHtml(enlaceCompleto)}" style="color: #2563eb;">Ver acta completa en la aplicación</a></p>
    <p style="color: #64748b; font-size: 0.875rem; margin-top: 24px;">Este es un mensaje automático. Por favor no responda directamente a este correo.</p>
  </div>
</body>
</html>
`.trim();
}
