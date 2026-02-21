/** Opciones de elementos por página para tablas */
export const OPCIONES_POR_PAGINA = [10, 15, 25, 50, 100] as const;

export const DEFAULT_POR_PAGINA = 15;

/**
 * Parsea el parámetro perPage de la URL. Devuelve un valor válido dentro de OPCIONES_POR_PAGINA.
 */
export function parsePerPage(value: string | undefined): number {
  if (value == null || value === "") return DEFAULT_POR_PAGINA;
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1) return DEFAULT_POR_PAGINA;
  const valid = OPCIONES_POR_PAGINA.includes(n as (typeof OPCIONES_POR_PAGINA)[number]);
  return valid ? n : DEFAULT_POR_PAGINA;
}
