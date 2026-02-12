/**
 * Template HTML para el email de recuperación de contraseña.
 */
export type DatosEmailRecuperacionPassword = {
  nombre: string;
  resetUrl: string;
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

export function renderTemplateRecuperacionPassword(
  datos: DatosEmailRecuperacionPassword
): string {
  const nombreSafe = escapeHtml(datos.nombre);
  const urlSafe = escapeHtml(datos.resetUrl);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperar contraseña</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 1.5rem;">Recuperar contraseña</h1>
    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 0.9rem;">Gestor de Impuestos</p>
  </div>
  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Hola <strong>${nombreSafe}</strong>,</p>
    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el siguiente enlace para elegir una nueva contraseña:</p>
    <p style="margin: 24px 0;">
      <a href="${urlSafe}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Restablecer contraseña</a>
    </p>
    <p style="color: #64748b; font-size: 0.875rem;">Si no solicitaste este cambio, puedes ignorar este correo. El enlace expira en 1 hora por seguridad.</p>
    <p style="color: #64748b; font-size: 0.875rem;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
    <p style="word-break: break-all; font-size: 0.8rem; color: #64748b;">${urlSafe}</p>
  </div>
</body>
</html>
`;
}
