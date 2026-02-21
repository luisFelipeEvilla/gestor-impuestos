import type { CategoriaDocumentoNota } from "@/lib/proceso-categorias";

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

const VALUE_TO_ENTRY = Object.fromEntries(
  TIPOS_DOCUMENTO_PROCESO.map((t) => [t.value, t])
) as Record<TipoDocumentoProceso, (typeof TIPOS_DOCUMENTO_PROCESO)[number]>;

/** Tipos permitidos por categoría: en cada etapa solo se ofrecen los relevantes. */
const TIPOS_POR_CATEGORIA: Record<CategoriaDocumentoNota, TipoDocumentoProceso[]> = {
  general: ["orden_resolucion", "acta_notificacion", "liquidacion", "constancia_pago", "otro"],
  en_contacto: ["acta_notificacion", "liquidacion", "otro"],
  acuerdo_pago: ["acuerdo_pago_firmado", "liquidacion", "constancia_pago", "otro"],
  cobro_coactivo: [
    "mandamiento_pago",
    "medidas_cautelares",
    "resolucion_incumplimiento",
    "auto_terminacion",
    "constancia_pago",
    "otro",
  ],
  evidencia_notificacion: ["acta_notificacion", "otro"],
};

/**
 * Devuelve los tipos de documento que se pueden elegir al subir un documento en la categoría dada.
 * Así en cada pestaña (General, Acuerdos de pago, Cobro coactivo) solo se muestran tipos de esa etapa.
 */
export function getTiposDocumentoPorCategoria(
  categoria: CategoriaDocumentoNota
): { value: TipoDocumentoProceso; label: string }[] {
  const values = TIPOS_POR_CATEGORIA[categoria] ?? ["otro"];
  return values
    .map((v) => VALUE_TO_ENTRY[v])
    .filter(Boolean) as { value: TipoDocumentoProceso; label: string }[];
}

/** Indica si un tipo de documento está permitido para la categoría (validación servidor). */
export function isTipoPermitidoParaCategoria(
  categoria: CategoriaDocumentoNota,
  tipo: TipoDocumentoProceso
): boolean {
  const permitidos = TIPOS_POR_CATEGORIA[categoria] ?? ["otro"];
  return permitidos.includes(tipo);
}

export function labelTipoDocumentoProceso(tipo: string | null | undefined): string {
  if (tipo == null || tipo === "") return "—";
  return LABELS[tipo] ?? tipo.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
