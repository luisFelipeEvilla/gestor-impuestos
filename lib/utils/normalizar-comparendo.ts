/**
 * Normalización de números de comparendo/resolución para emparejamiento
 * entre CSV de acuerdos y procesos en BD.
 */

export function soloDigitos(val: string): string {
  return (val ?? "").replace(/\D/g, "").trim();
}

export function normalizarClaveComparendo(val: string): string[] {
  const digits = soloDigitos(val);
  if (!digits) return [];
  const keys: string[] = [digits];
  const sinCeros = digits.replace(/^0+/, "") || "0";
  if (sinCeros !== digits) keys.push(sinCeros);
  return keys;
}

/**
 * Genera todas las claves de búsqueda para un número de comparendo/resolución
 * (incluye sufijos cuando el número es largo, para formato tipo 99999999000002201522).
 */
export function clavesParaBusqueda(noComparendo: string): string[] {
  const candidatos = [...normalizarClaveComparendo(noComparendo)];
  const digits = soloDigitos(noComparendo);
  if (digits.length > 7) {
    candidatos.push(digits.slice(-10));
    candidatos.push(digits.slice(-8));
    candidatos.push(digits.slice(-7));
  }
  return candidatos;
}

/**
 * Busca procesoId en el índice por el "N° Comparendo" del CSV de acuerdos.
 * índice: Map de clave normalizada -> procesoId (varias claves pueden apuntar al mismo proceso).
 */
export function buscarProcesoIdPorComparendo(
  noComparendoFromCsv: string,
  indice: Map<string, number>
): number | null {
  const candidatos = clavesParaBusqueda(noComparendoFromCsv);
  const seen = new Set<string>();
  for (const c of candidatos) {
    if (!c || seen.has(c)) continue;
    seen.add(c);
    const sinCeros = c.replace(/^0+/, "") || "0";
    if (indice.has(c)) return indice.get(c) ?? null;
    if (indice.has(sinCeros)) return indice.get(sinCeros) ?? null;
  }
  return null;
}
