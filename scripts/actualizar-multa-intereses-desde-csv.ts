/**
 * Actualiza procesos existentes en BD con monto_multa_cop y monto_intereses_cop
 * leyendo del CSV de cartera. Solo actualiza cuando valor deuda = valor multa + valor intereses
 * (tolerancia 0.01 COP); si no cuadra, se omite y se registra.
 *
 * Uso: pnpm exec tsx scripts/actualizar-multa-intereses-desde-csv.ts [ruta.csv] [--dry-run]
 * Sin argumentos: usa ReporteCarteraActual.csv en la raíz.
 *
 * Requiere: DATABASE_URL en .env
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import { db } from "../lib/db";
import { contribuyentes, procesos } from "../lib/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";

const CSV_PATH = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(process.cwd(), "ReporteCarteraActual.csv");
const DRY_RUN = process.argv.includes("--dry-run");

const TOLERANCIA = 0.01;

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function createProgressSpinner(total: number) {
  const start = Date.now();
  const state = { current: 0, done: false };
  let frameIndex = 0;
  const interval = setInterval(() => {
    if (state.done) {
      clearInterval(interval);
      return;
    }
    const elapsed = formatElapsed(Date.now() - start);
    const pct = total > 0 ? Math.round((state.current / total) * 100) : 0;
    const frame = SPINNER_FRAMES[frameIndex % SPINNER_FRAMES.length];
    frameIndex++;
    const line = ` ${frame} Procesando ${state.current.toLocaleString()} / ${total.toLocaleString()} (${pct}%) — ${elapsed}`;
    process.stdout.write(`\r${line}`);
  }, 80);
  return {
    update: (current: number) => {
      state.current = current;
    },
    stop: () => {
      state.done = true;
      clearInterval(interval);
      process.stdout.write("\r" + " ".repeat(100) + "\r");
    },
  };
}

function normalizarHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function limpia(val: string): string {
  return val.replace(/^'/, "").trim();
}

function parseLine(line: string): string[] {
  const raw = line.trim().replace(/^'|';?\s*$/g, "");
  return raw.split(";").map((cell) => limpia(cell));
}

function parseFechaCsv(value: string): string | null {
  const trimmed = value.replace(/^'|'$/g, "").trim();
  if (!trimmed) return null;
  const parts = trimmed.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  let year = parseInt(y!, 10);
  if (year < 100) year += year < 50 ? 2000 : 1900;
  const month = parseInt(m!, 10);
  const day = parseInt(d!, 10);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  )
    return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(iso + "T12:00:00Z");
  return Number.isNaN(date.getTime()) ? null : iso;
}

function buildIdempotenciaKey(
  noComparendo: string | null,
  fechaAplicacion: string | null,
  montoCop: string,
  noDocumentoInfractor: string
): string {
  const noComp = (noComparendo ?? "").trim();
  const fecha = fechaAplicacion ?? "";
  const doc = (noDocumentoInfractor ?? "").trim();
  return `${noComp}|${fecha}|${montoCop}|${doc}`;
}

function parseMonto(raw: string): number {
  const n = parseFloat((raw || "0").replace(/,/g, "."));
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

interface CsvRow {
  linea: number;
  key: string;
  montoCop: string;
  multaNum: number;
  interesesNum: number;
  deudaNum: number;
  valorDeuda: string;
  valorMulta: string;
  valorIntereses: string;
}

function parseCsv(filePath: string): CsvRow[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerRaw = parseLine(lines[0]!);
  const header = headerRaw.map((cell) => normalizarHeader(cell));
  const idx = {
    nroComparendo: header.indexOf("Nro Comparendo"),
    fechaComparendo: header.indexOf("Fecha Comparendo"),
    fechaResolucion: header.indexOf("Fecha Resolucion"),
    identificacion: header.indexOf("Identificacion Infractor"),
    valorMulta: header.indexOf("Valor Multa"),
    valorIntereses: header.indexOf("Valor Intereses"),
    valorDeuda: header.indexOf("Valor Deuda"),
  };

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]!);
    const get = (k: keyof typeof idx): string =>
      idx[k] >= 0 && cells[idx[k]] !== undefined ? cells[idx[k]]! : "";

    const fechaComparendo = parseFechaCsv(get("fechaComparendo"));
    const fechaResolucion = parseFechaCsv(get("fechaResolucion"));
    const fechaAplicacion = fechaComparendo ?? fechaResolucion ?? null;

    const multaNum = parseMonto(get("valorMulta"));
    const interesesNum = parseMonto(get("valorIntereses"));
    const deudaNum = parseMonto(get("valorDeuda"));
    const montoTotal =
      deudaNum > 0 ? deudaNum : (multaNum + interesesNum > 0 ? multaNum + interesesNum : 0);
    const montoCop = montoTotal.toFixed(2);

    const noComparendo = get("nroComparendo").trim() ? limpia(get("nroComparendo")) : null;
    const nit = (get("identificacion") ?? "").trim();
    const key = buildIdempotenciaKey(noComparendo, fechaAplicacion, montoCop, nit);

    rows.push({
      linea: i + 1,
      key,
      montoCop,
      multaNum,
      interesesNum,
      deudaNum,
      valorDeuda: get("valorDeuda"),
      valorMulta: get("valorMulta"),
      valorIntereses: get("valorIntereses"),
    });
  }
  return rows;
}

interface ProcesoEnBd {
  id: number;
  montoCop: string;
}

async function loadProcesosByKey(): Promise<Map<string, ProcesoEnBd>> {
  const rows = await db
    .select({
      id: procesos.id,
      montoCop: procesos.montoCop,
      noComparendo: procesos.noComparendo,
      fechaAplicacionImpuesto: procesos.fechaAplicacionImpuesto,
      nit: contribuyentes.nit,
    })
    .from(procesos)
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id));

  const map = new Map<string, ProcesoEnBd>();
  for (const r of rows) {
    const montoStr = String(r.montoCop ?? "0");
    const montoNormalized = (parseFloat(montoStr) || 0).toFixed(2);
    const key = buildIdempotenciaKey(
      r.noComparendo,
      r.fechaAplicacionImpuesto,
      montoNormalized,
      r.nit ?? ""
    );
    map.set(key, { id: r.id, montoCop: montoNormalized });
  }
  return map;
}

async function main(): Promise<void> {
  console.log("CSV:", CSV_PATH);
  if (DRY_RUN) console.log("Modo: dry-run (no se escribirá en BD)\n");

  const csvRows = parseCsv(CSV_PATH);
  const bdMap = await loadProcesosByKey();

  let actualizados = 0;
  let omitidosSinMatch = 0;
  let omitidosVerificacionFallida = 0;
  const ejemplosVerificacionFallida: { linea: number; suma: number; deuda: number }[] = [];

  const spinner = createProgressSpinner(csvRows.length);
  let processed = 0;

  for (const row of csvRows) {
    processed++;
    spinner.update(processed);
    const proceso = bdMap.get(row.key);
    if (!proceso) {
      omitidosSinMatch++;
      continue;
    }

    // Verificación: valor deuda = valor multa + valor intereses (si hay valor deuda)
    if (row.deudaNum > 0) {
      const suma = row.multaNum + row.interesesNum;
      const diff = Math.abs(suma - row.deudaNum);
      if (diff > TOLERANCIA) {
        omitidosVerificacionFallida++;
        if (ejemplosVerificacionFallida.length < 10) {
          ejemplosVerificacionFallida.push({
            linea: row.linea,
            suma,
            deuda: row.deudaNum,
          });
        }
        continue;
      }
    }

    if (!DRY_RUN) {
      const montoMultaCop = row.multaNum > 0 ? row.multaNum.toFixed(2) : null;
      const montoInteresesCop = row.interesesNum > 0 ? row.interesesNum.toFixed(2) : null;
      await db
        .update(procesos)
        .set({
          montoMultaCop,
          montoInteresesCop,
          actualizadoEn: new Date(),
        })
        .where(eq(procesos.id, proceso.id));
    }
    actualizados++;
  }

  spinner.stop();
  console.log("\n--- Resumen ---");
  console.log("Filas CSV procesadas:", csvRows.length);
  console.log("Actualizados:", actualizados);
  console.log("Omitidos (sin match en BD):", omitidosSinMatch);
  console.log("Omitidos (valor deuda ≠ multa + intereses):", omitidosVerificacionFallida);

  if (ejemplosVerificacionFallida.length > 0) {
    console.log("\nEjemplos donde valor deuda ≠ multa + intereses:");
    ejemplosVerificacionFallida.forEach((e) =>
      console.log(`  Línea ${e.linea}: multa+intereses=${e.suma.toFixed(2)} valorDeuda=${e.deuda.toFixed(2)}`)
    );
  }

  if (!DRY_RUN && actualizados > 0) {
    const conMultaEIntereses = await db
      .select({
        id: procesos.id,
        montoCop: procesos.montoCop,
        montoMultaCop: procesos.montoMultaCop,
        montoInteresesCop: procesos.montoInteresesCop,
      })
      .from(procesos)
      .where(
        and(isNotNull(procesos.montoMultaCop), isNotNull(procesos.montoInteresesCop))
      );

    const erroresVerificacionFinal: { id: number; total: number; suma: number }[] = [];
    for (const p of conMultaEIntereses) {
      const total = Number(p.montoCop ?? 0);
      const multa = Number(p.montoMultaCop ?? 0);
      const intereses = Number(p.montoInteresesCop ?? 0);
      const suma = multa + intereses;
      if (Math.abs(total - suma) > TOLERANCIA) {
        erroresVerificacionFinal.push({ id: p.id, total, suma });
      }
    }

    console.log("\n--- Reporte informativo (BD) ---");
    console.log(
      "Procesos con multa e intereses no nulos:",
      conMultaEIntereses.length
    );
    if (erroresVerificacionFinal.length === 0) {
      console.log("En todos ellos multa + intereses = monto_cop (tolerancia 0.01).");
    } else {
      console.log(
        "Procesos donde multa + intereses ≠ monto_cop (solo informativo):",
        erroresVerificacionFinal.length
      );
      erroresVerificacionFinal.slice(0, 10).forEach((e) =>
        console.log(`  Proceso id=${e.id} total=${e.total.toFixed(2)} suma=${e.suma.toFixed(2)}`)
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
