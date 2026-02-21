/**
 * Tipos de documento soportados (valor en BD y etiqueta para UI).
 * Una sola fuente de verdad para formularios, detalle y PDF.
 */
export const TIPOS_DOCUMENTO = [
  { value: "nit", label: "NIT" },
  { value: "cedula", label: "Cédula ciudadanía" },
  { value: "cedula_ecuatoriana", label: "Cédula ecuatoriana" },
  { value: "cedula_venezolana", label: "Cédula venezolana" },
  { value: "cedula_extranjeria", label: "Cédula extranjería" },
  { value: "pasaporte", label: "Pasaporte" },
  { value: "permiso_proteccion_temporal", label: "Permiso de protección temporal" },
  { value: "tarjeta_identidad", label: "Tarjeta de identidad" },
] as const;

export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number]["value"];

/** Tuple para z.enum() en validaciones */
export const TIPO_DOCUMENTO_VALUES_ZOD = [
  "nit",
  "cedula",
  "cedula_ecuatoriana",
  "cedula_venezolana",
  "cedula_extranjeria",
  "pasaporte",
  "permiso_proteccion_temporal",
  "tarjeta_identidad",
] as const;

export const TIPO_DOCUMENTO_VALUES: TipoDocumento[] = [...TIPO_DOCUMENTO_VALUES_ZOD];

const LABELS: Record<TipoDocumento, string> = Object.fromEntries(
  TIPOS_DOCUMENTO.map((t) => [t.value, t.label])
) as Record<TipoDocumento, string>;

export function getTipoDocumentoLabel(value: string): string {
  return LABELS[value as TipoDocumento] ?? value;
}
