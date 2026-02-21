/**
 * Tipos de documento del proceso (trazabilidad y auditoría).
 * Valores del enum tipo_documento_proceso y etiquetas para la UI.
 */
export const TIPOS_DOCUMENTO_PROCESO = [
  { value: "orden_resolucion", label: "Orden de resolución" },
  { value: "mandamiento_pago", label: "Mandamiento de pago" },
  { value: "acta_notificacion", label: "Acta / Constancia de notificación" },
  { value: "acuerdo_pago_firmado", label: "Acuerdo de pago firmado" },
  { value: "liquidacion", label: "Liquidación" },
  { value: "medidas_cautelares", label: "Medidas cautelares" },
  { value: "resolucion_incumplimiento", label: "Resolución de incumplimiento" },
  { value: "auto_terminacion", label: "Auto de terminación" },
  { value: "constancia_pago", label: "Constancia de pago" },
  { value: "otro", label: "Otro" },
] as const;

export type TipoDocumentoProceso = (typeof TIPOS_DOCUMENTO_PROCESO)[number]["value"];

const LABELS: Record<string, string> = Object.fromEntries(
  TIPOS_DOCUMENTO_PROCESO.map((t) => [t.value, t.label])
);

export function labelTipoDocumentoProceso(tipo: string | null | undefined): string {
  if (tipo == null || tipo === "") return "—";
  return LABELS[tipo] ?? tipo.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
