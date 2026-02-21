/**
 * Semaforización de fecha límite (prescripción).
 * - Rojo: ya pasó la fecha (prescrito) o faltan ≤ 6 meses (prescripción muy cercana)
 * - Amarillo: faltan entre 6 y 12 meses (prescripción cercana)
 * - Verde: faltan más de 12 meses (en plazo)
 * - Sin fecha: no hay fecha límite
 */

export type SemáforoFechaLimite = "rojo" | "amarillo" | "verde" | "sin_fecha";

/** 6 meses en días (aprox.) */
const DÍAS_6_MESES = 182;
/** 12 meses en días */
const DÍAS_12_MESES = 365;

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
  if (días < 0) return "rojo"; // prescrito
  if (días <= DÍAS_6_MESES) return "rojo"; // prescripción muy cercana
  if (días <= DÍAS_12_MESES) return "amarillo"; // prescripción cercana
  return "verde"; // en plazo
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
 * Texto corto para mostrar al usuario según proximidad a prescripción.
 */
export function getTextoEstadoFechaLimite(
  fechaLimite: string | Date | null | undefined,
  fechaReferencia: Date = new Date()
): string {
  const días = getDíasRestantesFechaLimite(fechaLimite, fechaReferencia);
  if (días === null) return "Sin fecha límite";
  if (días < 0) return "Prescrito";
  if (días <= DÍAS_6_MESES) return "Prescripción muy cercana";
  if (días <= DÍAS_12_MESES) return "Prescripción cercana";
  return "En plazo";
}
