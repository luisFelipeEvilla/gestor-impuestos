const TZ_BOGOTA = "America/Bogota";
/** Para columnas tipo date (solo día): evita que medianoche UTC se muestre como día anterior en Colombia. */
const TZ_DATE_ONLY = "UTC";

/**
 * "15 ene. 2024" — para fechas de calendario (date sin hora).
 */
export function formatFecha(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", {
    timeZone: TZ_DATE_ONLY,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * "15 de enero de 2024" — para fechas de calendario (date sin hora).
 */
export function formatFechaLarga(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", { timeZone: TZ_DATE_ONLY, dateStyle: "long" });
}

/**
 * "15/01/2024" — para fechas de calendario (date sin hora).
 */
export function formatFechaCorta(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", {
    timeZone: TZ_DATE_ONLY,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * "15 ene. 2024, 10:30 a. m." — para timestamps (momento exacto en Colombia).
 */
export function formatFechaHora(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CO", {
    timeZone: TZ_BOGOTA,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * "15/01/2024, 10:30 a. m." — para timestamps (momento exacto en Colombia).
 */
export function formatFechaHoraCorta(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CO", {
    timeZone: TZ_BOGOTA,
    dateStyle: "short",
    timeStyle: "short",
  });
}
