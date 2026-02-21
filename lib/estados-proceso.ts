/**
 * Etiquetas de estado de proceso para mostrar en la UI.
 * El valor en BD (ej. en_contacto) se mantiene; aquí solo la etiqueta visible.
 */
const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  asignado: "Asignado",
  notificado: "Notificado",
  en_contacto: "Cobro persuasivo",
  en_cobro_coactivo: "En cobro coactivo",
  cobrado: "Cobrado",
};

/**
 * Devuelve la etiqueta de un estado para mostrar al usuario.
 * Si no está en el mapa, formatea el valor (reemplaza _ por espacio y capitaliza).
 */
export function labelEstado(estado: string | null | undefined): string {
  if (estado == null || estado === "") return "—";
  return ESTADO_LABELS[estado] ?? estado.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
