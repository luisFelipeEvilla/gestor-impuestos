const TZ = "America/Bogota";

/**
 * "15 ene. 2024"
 */
export function formatFecha(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * "15 de enero de 2024"
 */
export function formatFechaLarga(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", { timeZone: TZ, dateStyle: "long" });
}

/**
 * "15/01/2024"
 */
export function formatFechaCorta(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * "15 ene. 2024, 10:30 a. m."
 */
export function formatFechaHora(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CO", {
    timeZone: TZ,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * "15/01/2024, 10:30 a. m."
 */
export function formatFechaHoraCorta(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CO", {
    timeZone: TZ,
    dateStyle: "short",
    timeStyle: "short",
  });
}
