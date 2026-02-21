/**
 * Etiquetas de estado de proceso para mostrar en la UI (6 estados).
 */
const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  asignado: "Asignado",
  facturacion: "Facturación",
  acuerdo_pago: "Acuerdo de pago",
  en_cobro_coactivo: "Cobro coactivo",
  finalizado: "Finalizado",
};

/**
 * Devuelve la etiqueta de un estado para mostrar al usuario.
 * Si no está en el mapa, formatea el valor (reemplaza _ por espacio y capitaliza).
 */
export function labelEstado(estado: string | null | undefined): string {
  if (estado == null || estado === "") return "—";
  return ESTADO_LABELS[estado] ?? estado.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
