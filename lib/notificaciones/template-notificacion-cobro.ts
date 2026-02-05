/**
 * Template HTML de ejemplo para la notificación de cobro al contribuyente.
 * Variables: nombreContribuyente, impuestoNombre, impuestoCodigo, montoCop, vigencia, periodo, procesoId.
 */
export type DatosNotificacionCobro = {
  nombreContribuyente: string;
  impuestoNombre: string;
  impuestoCodigo: string;
  montoCop: string;
  vigencia: number;
  periodo: string | null;
  procesoId: number;
};

export function renderTemplateNotificacionCobro(datos: DatosNotificacionCobro): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificación de cobro</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 1.5rem;">Notificación de cobro</h1>
    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 0.9rem;">Gestor de Impuestos</p>
  </div>
  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Estimado(a) <strong>${escapeHtml(datos.nombreContribuyente)}</strong>,</p>
    <p>Por medio de la presente le informamos que se ha registrado un proceso de cobro a su nombre con el siguiente detalle:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr style="background: #f8fafc;">
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;"><strong>Impuesto</strong></td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">${escapeHtml(datos.impuestoCodigo)} – ${escapeHtml(datos.impuestoNombre)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;"><strong>Vigencia${datos.periodo ? " / Período" : ""}</strong></td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">${datos.vigencia}${datos.periodo ? ` · ${escapeHtml(datos.periodo)}` : ""}</td>
      </tr>
      <tr style="background: #f8fafc;">
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;"><strong>Monto (COP)</strong></td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">${escapeHtml(datos.montoCop)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;"><strong>Proceso</strong></td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">#${datos.procesoId}</td>
      </tr>
    </table>
    <p>Le solicitamos ponerse en contacto con nuestra dependencia para regularizar su situación o acordar un plan de pagos.</p>
    <p style="color: #64748b; font-size: 0.875rem; margin-top: 24px;">Este es un mensaje automático. Por favor no responda directamente a este correo.</p>
  </div>
</body>
</html>
`.trim();
}

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
