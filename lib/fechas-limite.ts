/**
 * Semaforización de fecha límite (prescripción 5 años).
 * - Rojo: vencido o faltan ≤ 30 días
 * - Amarillo: faltan entre 31 y 365 días
 * - Verde: faltan más de 365 días
 * - Sin fecha: no hay fecha límite
 */

export type SemáforoFechaLimite = "rojo" | "amarillo" | "verde" | "sin_fecha";

const DÍAS_UMBRAL_ROJO = 30;
const DÍAS_UMBRAL_AMARILLO = 365;

/**
 * Devuelve el estado del semáforo según la fecha límite y la fecha de referencia (por defecto hoy).
 */
export function getSemáforoFechaLimite(
  fechaLimite: string | Date | null | undefined,
  fechaReferencia: Date = new Date()
): SemáforoFechaLimite {
  if (!fechaLimite) return "sin_fecha";
  const límite = typeof fechaLimite === "string" ? new Date(fechaLimite + "T12:00:00") : fechaLimite;
  if (Number.isNaN(límite.getTime())) return "sin_fecha";
  const hoy = new Date(fechaReferencia);
  hoy.setHours(0, 0, 0, 0);
  límite.setHours(0, 0, 0, 0);
  const diffMs = límite.getTime() - hoy.getTime();
  const días = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (días < 0) return "rojo"; // vencido
  if (días <= DÍAS_UMBRAL_ROJO) return "rojo";
  if (días <= DÍAS_UMBRAL_AMARILLO) return "amarillo";
  return "verde";
}

/**
 * Días restantes hasta la fecha límite (negativo si ya venció).
 */
export function getDíasRestantesFechaLimite(
  fechaLimite: string | Date | null | undefined,
  fechaReferencia: Date = new Date()
): number | null {
  if (!fechaLimite) return null;
  const límite = typeof fechaLimite === "string" ? new Date(fechaLimite + "T12:00:00") : fechaLimite;
  if (Number.isNaN(límite.getTime())) return null;
  const hoy = new Date(fechaReferencia);
  hoy.setHours(0, 0, 0, 0);
  límite.setHours(0, 0, 0, 0);
  const diffMs = límite.getTime() - hoy.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Texto corto para mostrar al usuario (ej. "Vence en 15 días", "Vencido hace 3 días").
 */
export function getTextoEstadoFechaLimite(
  fechaLimite: string | Date | null | undefined,
  fechaReferencia: Date = new Date()
): string {
  const días = getDíasRestantesFechaLimite(fechaLimite, fechaReferencia);
  if (días === null) return "Sin fecha límite";
  if (días < 0) return `Vencido hace ${Math.abs(días)} ${Math.abs(días) === 1 ? "día" : "días"}`;
  if (días === 0) return "Vence hoy";
  if (días === 1) return "Vence mañana";
  if (días <= 30) return `Vence en ${días} días`;
  if (días <= 365) return `Vence en ${días} días`;
  return `Vence en ${días} días`;
}
