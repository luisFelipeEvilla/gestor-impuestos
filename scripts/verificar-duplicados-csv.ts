/**
 * Verifica si el CSV de cartera tiene filas duplicadas por número de comparendo.
 * Usa la misma columna que el import (Nro Comparendo → no_comparendo).
 *
 * Uso: pnpm exec tsx scripts/verificar-duplicados-csv.ts [ruta-opcional.csv]
 * Por defecto: ReporteCarteraActual.csv (o CARTERA_CSV_PATH en .env).
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";

const CSV_PATH =
  process.env.CARTERA_CSV_PATH ||
  (process.argv[2] ? resolve(process.cwd(), process.argv[2]) : resolve(process.cwd(), "ReporteCarteraActual.csv"));

function limpia(val: string): string {
  return val.replace(/^'/, "").trim();
}

function normalizarHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function parseLine(line: string): string[] {
  const raw = line.trim().replace(/^'|';?\s*$/g, "");
  return raw.split(";").map((cell) => limpia(cell));
}

function main(): void {
  let content: string;
  try {
    content = readFileSync(CSV_PATH, "utf-8");
  } catch {
    console.error("❌ No se encontró el archivo:", CSV_PATH);
    process.exit(1);
  }

  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.log("El CSV no tiene filas de datos.");
    return;
  }

  const headerRaw = parseLine(lines[0]!);
  const header = headerRaw.map((cell) => normalizarHeader(cell));
  const idxNroComparendo = header.indexOf("Nro Comparendo");
  if (idxNroComparendo < 0) {
    console.error("❌ No se encontró la columna 'Nro Comparendo' en el CSV.");
    process.exit(1);
  }

  const filasPorNoComparendo = new Map<string, number[]>();
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]!);
    const valor = cells[idxNroComparendo] !== undefined ? limpia(cells[idxNroComparendo]!) : "";
    const clave = valor || "(vacío)";
    const list = filasPorNoComparendo.get(clave) ?? [];
    list.push(i + 1);
    filasPorNoComparendo.set(clave, list);
  }

  const totalFilas = lines.length - 1;
  const clavesUnicas = filasPorNoComparendo.size;
  const duplicados = [...filasPorNoComparendo.entries()].filter(([, indices]) => indices.length > 1);
  const numClavesConDuplicados = duplicados.length;
  const filasAfectadasPorDuplicados = duplicados.reduce((sum, [, indices]) => sum + indices.length, 0);
  const filasSobrantes = duplicados.reduce((sum, [, indices]) => sum + (indices.length - 1), 0);

  console.log("--- Duplicados en CSV por Nro Comparendo ---\n");
  console.log(`Archivo: ${CSV_PATH}`);
  console.log(`Total filas de datos: ${totalFilas.toLocaleString()}`);
  console.log(`Números de comparendo únicos: ${clavesUnicas.toLocaleString()}`);
  console.log(`Números que se repiten (duplicados): ${numClavesConDuplicados.toLocaleString()}`);
  console.log(`Filas con número repetido: ${filasAfectadasPorDuplicados.toLocaleString()}`);
  console.log(`Filas “sobrantes” (dejando 1 por número): ${filasSobrantes.toLocaleString()}`);

  if (numClavesConDuplicados > 0) {
    console.log("\n--- Ejemplos (primeros 10 números repetidos) ---");
    for (const [clave, indices] of duplicados.slice(0, 10)) {
      const muestra = indices.slice(0, 5).join(", ") + (indices.length > 5 ? "..." : "");
      console.log(`  "${clave.slice(0, 50)}${clave.length > 50 ? "..." : ""}" → ${indices.length} veces (filas: ${muestra})`);
    }
  }
}

main();
