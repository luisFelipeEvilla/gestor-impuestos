/**
 * Script para importar cartera de impuesto vehicular desde CSV.
 * Por cada fila crea/reutiliza el contribuyente (sin duplicados),
 * crea/reutiliza el vehículo por placa, y genera un registro de
 * impuesto por cada vigencia donde el capital sea mayor a cero.
 *
 * Estrategia de rendimiento:
 *  - Fase 1: upsert masivo de contribuyentes (lotes de BATCH_SIZE)
 *  - Fase 2: upsert masivo de vehículos (lotes de BATCH_SIZE)
 *  - Fase 3: insert masivo de impuestos + historial con
 *            CONCURRENCY transacciones en paralelo
 *
 * Uso: pnpm run import:vehiculos [ruta-opcional.csv]
 * Ruta por defecto: "Cartera Vehiculos.csv" (o VEHICULOS_CSV_PATH en .env).
 * Requiere: DATABASE_URL en .env.
 */
import "dotenv/config";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import type { TipoDocumento } from "../lib/constants/tipo-documento";
import { db } from "../lib/db";
import {
  contribuyentes,
  vehiculos,
  impuestos,
  historialImpuesto,
} from "../lib/db/schema";
import { eq, sql } from "drizzle-orm";

const CSV_PATH =
  process.env.VEHICULOS_CSV_PATH ||
  (process.argv[2]
    ? resolve(process.cwd(), process.argv[2])
    : resolve(process.cwd(), "Cartera Vehiculos.csv"));

const IMPORT_OUTPUT_DIR = "import-vehiculos-output";

/** Vigencias presentes en el CSV. */
const AÑOS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

/** Filas por lote para contribuyentes y vehículos. */
const BATCH_SIZE = 500;
/** Filas por lote para impuestos (transacciones más pesadas). */
const IMPUESTO_BATCH_SIZE = 200;
/** Número de lotes de impuestos procesados en paralelo. */
const CONCURRENCY = 5;

// ────────────────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────────────────

interface FilaVehiculo {
  identificador: string;
  placa: string;
  nombre: string;
  tipoId: TipoDocumento;
  idPropietario: string;
  direccion: string;
  telefono: string;
  correo: string;
  modelo: number | null;
  clase: string;
  marca: string;
  linea: string;
  cilindraje: number | null;
  /** capital e interés por año. Cero si no aplica. */
  montos: Record<number, { capital: number; interes: number }>;
}

interface ImpuestoToInsert {
  placa: string;
  año: number;
  contribuyenteId: number;
  vehiculoId: number;
  capital: number;
  interes: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function limpia(val: string): string {
  return val.replace(/^'/, "").trim();
}

function normalizarHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase();
}

/** Mapea TIPOID del CSV al enum de BD. Desconocidos → cedula. */
function mapTipoId(raw: string): TipoDocumento {
  const n = raw.trim().toUpperCase();
  if (n === "NIT") return "nit";
  if (n === "TI") return "tarjeta_identidad";
  if (n === "CE") return "cedula_extranjeria";
  if (n === "PA") return "pasaporte";
  if (n === "PPT") return "permiso_proteccion_temporal";
  return "cedula";
}

/** Contribuyente clave de deduplicación. */
function contribuyenteKey(tipoDoc: TipoDocumento, nit: string): string {
  return `${tipoDoc}:${nit}`;
}

/** Clave de idempotencia para impuesto vehicular: placa + año. */
function impuestoKey(placa: string, vigencia: number): string {
  return `${placa.toUpperCase()}|${vigencia}`;
}

function parseMonto(raw: string): number {
  const n = parseFloat((raw || "0").replace(/,/g, "."));
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

/** Divide un array en sub-arrays de tamaño `size`. */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Ejecuta un arreglo de funciones async con un límite de concurrencia.
 * Preserva el orden de los resultados.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIdx = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const i = nextIdx++;
      if (i >= tasks.length) break;
      results[i] = await tasks[i]!();
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker),
  );
  return results;
}

// ────────────────────────────────────────────────────────────────────────────
// Parseo del CSV
// ────────────────────────────────────────────────────────────────────────────

function parseLine(line: string): string[] {
  return line
    .trim()
    .replace(/^'|';?\s*$/g, "")
    .split(";")
    .map((c) => limpia(c));
}

function parseCsv(content: string): FilaVehiculo[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const rawHeader = parseLine(lines[0]!);
  const header = rawHeader.map(normalizarHeader);

  const idx = {
    identificador: header.indexOf("IDENTIFICADOR"),
    placa: header.indexOf("PLACA"),
    nombre: header.indexOf("NOMBRE"),
    tipoId: header.indexOf("TIPOID"),
    idPropietario: header.indexOf("IDPROPIETARIO"),
    direccion: header.indexOf("DIRECCION"),
    telefono: header.indexOf("TELEFONO"),
    correo: header.indexOf("CORREO"),
    modelo: header.indexOf("MODELO"),
    clase: header.indexOf("CLASE"),
    marca: header.indexOf("MARCA"),
    linea: header.indexOf("LINEA"),
    cilindraje: header.indexOf("CILINDRAJE"),
  };

  const montosIdx: Record<number, { capital: number; interes: number }> = {};
  for (const año of AÑOS) {
    montosIdx[año] = {
      capital: header.indexOf(`CAPITAL_${año}`),
      interes: header.indexOf(`INTERES_${año}`),
    };
  }

  const rows: FilaVehiculo[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]!);
    const get = (key: keyof typeof idx): string => {
      const col = idx[key];
      return col >= 0 && cells[col] !== undefined ? cells[col]! : "";
    };

    const placa = get("placa").toUpperCase();
    if (!placa) continue;

    const idPropietario = get("idPropietario") || "SIN-DOC";

    const modeloRaw = parseInt(get("modelo"), 10);
    const modelo = Number.isNaN(modeloRaw) ? null : modeloRaw;

    const cilindrajeRaw = parseInt(get("cilindraje"), 10);
    const cilindraje = Number.isNaN(cilindrajeRaw) ? null : cilindrajeRaw;

    const montos: Record<number, { capital: number; interes: number }> = {};
    for (const año of AÑOS) {
      const { capital: cIdx, interes: iIdx } = montosIdx[año]!;
      montos[año] = {
        capital: cIdx >= 0 ? parseMonto(cells[cIdx] ?? "0") : 0,
        interes: iIdx >= 0 ? parseMonto(cells[iIdx] ?? "0") : 0,
      };
    }

    rows.push({
      identificador: get("identificador"),
      placa,
      nombre: get("nombre") || "Sin nombre",
      tipoId: mapTipoId(get("tipoId")),
      idPropietario,
      direccion: get("direccion"),
      telefono: get("telefono"),
      correo: get("correo"),
      modelo,
      clase: get("clase"),
      marca: get("marca"),
      linea: get("linea"),
      cilindraje,
      montos,
    });
  }

  return rows;
}

// ────────────────────────────────────────────────────────────────────────────
// Spinner y utilidades de salida
// ────────────────────────────────────────────────────────────────────────────

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h > 0)
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
    const frame = SPINNER_FRAMES[frameIndex++ % SPINNER_FRAMES.length];
    process.stdout.write(
      `\r ${frame} Insertando impuestos ${state.current.toLocaleString()} / ${total.toLocaleString()} (${pct}%) — ${elapsed}`,
    );
  }, 80);
  return {
    update: (n: number) => {
      state.current = n;
    },
    stop: () => {
      state.done = true;
      clearInterval(interval);
      process.stdout.write("\r" + " ".repeat(100) + "\r");
    },
  };
}

function timestampForFilename(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("-");
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL no está definida en .env");
    process.exit(1);
  }

  let csvContent: string;
  try {
    csvContent = readFileSync(CSV_PATH, "latin1");
  } catch {
    console.error(`❌ No se encontró el archivo: ${CSV_PATH}`);
    process.exit(1);
  }

  const filas = parseCsv(csvContent);
  if (filas.length === 0) {
    console.error("❌ El CSV no tiene filas de datos.");
    process.exit(1);
  }
  console.log(`📄 Filas leídas: ${filas.length.toLocaleString()}`);

  const outputDir = join(process.cwd(), IMPORT_OUTPUT_DIR);
  mkdirSync(outputDir, { recursive: true });
  const ts = timestampForFilename();
  const errorFilePath = join(outputDir, `import-vehiculos-errores-${ts}.csv`);
  const omitidosFilePath = join(
    outputDir,
    `import-vehiculos-omitidos-${ts}.csv`,
  );

  const actualizadosFilePath = join(
    outputDir,
    `import-vehiculos-emails-actualizados-${ts}.csv`,
  );

  let errorFileCreado = false;
  let omitidosFileCreado = false;
  let actualizadosFileCreado = false;

  const appendActualizado = (
    nit: string,
    tipoDocumento: TipoDocumento,
    emailNuevo: string,
  ) => {
    if (!actualizadosFileCreado) {
      writeFileSync(
        actualizadosFilePath,
        "nit;tipo_documento;email_nuevo\n",
        "utf-8",
      );
      actualizadosFileCreado = true;
    }
    appendFileSync(
      actualizadosFilePath,
      `${nit};${tipoDocumento};${emailNuevo}\n`,
      "utf-8",
    );
  };

  const appendError = (placa: string, vigencia: number, motivo: string) => {
    if (!errorFileCreado) {
      writeFileSync(errorFilePath, "placa;vigencia;motivo\n", "utf-8");
      errorFileCreado = true;
    }
    appendFileSync(
      errorFilePath,
      `${placa};${vigencia};"${motivo.replace(/"/g, '""')}"\n`,
      "utf-8",
    );
  };

  const appendOmitido = (
    placa: string,
    vigencia: number | string,
    motivo: string,
  ) => {
    if (!omitidosFileCreado) {
      writeFileSync(omitidosFilePath, "placa;vigencia;motivo\n", "utf-8");
      omitidosFileCreado = true;
    }
    appendFileSync(
      omitidosFilePath,
      `${placa};${vigencia};${motivo}\n`,
      "utf-8",
    );
  };

  // ── Cargar datos existentes de BD ─────────────────────────────────────────
  const contribuyentesByKey = new Map<string, number>();
  /** Guarda el email actual de cada contribuyente en BD (null si no tiene). */
  const contribuyentesEmailMap = new Map<string, string | null>();

  const contribuyentesExistentes = await db
    .select({
      id: contribuyentes.id,
      nit: contribuyentes.nit,
      tipoDocumento: contribuyentes.tipoDocumento,
      email: contribuyentes.email,
    })
    .from(contribuyentes);
  for (const c of contribuyentesExistentes) {
    const cKey = contribuyenteKey(c.tipoDocumento, c.nit);
    contribuyentesByKey.set(cKey, c.id);
    contribuyentesEmailMap.set(cKey, c.email ?? null);
  }
  /**
   * Claves de contribuyentes que ya existían ANTES de esta ejecución.
   * Sirve para distinguirlos de los recién insertados al evaluar
   * si se debe actualizar el email.
   */
  const originalContribuyentesKeys = new Set(contribuyentesByKey.keys());

  console.log(
    `👤 Contribuyentes en BD: ${contribuyentesExistentes.length.toLocaleString()}`,
  );

  const vehiculosByPlaca = new Map<string, number>();
  const vehiculosExistentes = await db
    .select({ id: vehiculos.id, placa: vehiculos.placa })
    .from(vehiculos);
  for (const v of vehiculosExistentes) {
    vehiculosByPlaca.set(v.placa.toUpperCase(), v.id);
  }
  console.log(
    `🚗 Vehículos en BD: ${vehiculosExistentes.length.toLocaleString()}`,
  );

  const impuestosExistentes = new Set<string>();
  const impuestosRows = await db
    .select({
      vehiculoId: impuestos.vehiculoId,
      vigencia: impuestos.vigencia,
      placa: vehiculos.placa,
    })
    .from(impuestos)
    .innerJoin(vehiculos, eq(impuestos.vehiculoId, vehiculos.id))
    .where(eq(impuestos.tipoImpuesto, "vehicular"));
  for (const r of impuestosRows) {
    if (r.placa && r.vigencia) {
      impuestosExistentes.add(impuestoKey(r.placa, r.vigencia));
    }
  }
  console.log(
    `📋 Impuestos vehiculares en BD: ${impuestosExistentes.size.toLocaleString()}`,
  );

  let contribuyentesCreados = 0;
  let vehiculosCreados = 0;
  let impuestosCreados = 0;
  let omitidosYaEnBd = 0;
  let errores = 0;

  // ── Fase 1: Upsert masivo de contribuyentes ───────────────────────────────
  {
    type ContribuyenteInsert = typeof contribuyentes.$inferInsert & {
      _key: string;
    };
    const toInsert = new Map<string, ContribuyenteInsert>();

    for (const fila of filas) {
      const cKey = contribuyenteKey(fila.tipoId, fila.idPropietario);
      if (contribuyentesByKey.has(cKey) || toInsert.has(cKey)) continue;
      toInsert.set(cKey, {
        _key: cKey,
        nit: fila.idPropietario,
        tipoDocumento: fila.tipoId,
        nombreRazonSocial: fila.nombre,
        telefono: fila.telefono || null,
        email: fila.correo || null,
        direccion: fila.direccion || null,
        ciudad: null,
        departamento: null,
      });
    }

    const batches = chunk([...toInsert.values()], BATCH_SIZE);
    console.log(
      `👤 Contribuyentes nuevos a insertar: ${toInsert.size.toLocaleString()} en ${batches.length} lotes`,
    );

    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi]!;
      process.stdout.write(
        `\r   Contribuyentes: lote ${bi + 1}/${batches.length}...`,
      );
      try {
        const result = await db
          .insert(contribuyentes)
          .values(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            batch.map(({ _key, ...vals }) => vals),
          )
          .onConflictDoUpdate({
            target: [contribuyentes.tipoDocumento, contribuyentes.nit],
            set: {
              // Si ya existe sin email y el CSV trae uno, lo establece
              email: sql`COALESCE(${contribuyentes.email}, EXCLUDED.email)`,
              updatedAt: new Date(),
            },
          })
          .returning({
            id: contribuyentes.id,
            nit: contribuyentes.nit,
            tipoDocumento: contribuyentes.tipoDocumento,
          });

        for (const r of result) {
          const cKey = contribuyenteKey(r.tipoDocumento, r.nit);
          if (!contribuyentesByKey.has(cKey)) contribuyentesCreados++;
          contribuyentesByKey.set(cKey, r.id);
        }
      } catch (err) {
        // Fallback fila a fila si el lote falla
        for (const { _key, ...vals } of batch) {
          try {
            const [ins] = await db
              .insert(contribuyentes)
              .values(vals)
              .onConflictDoUpdate({
                target: [contribuyentes.tipoDocumento, contribuyentes.nit],
                set: {
                  email: sql`COALESCE(${contribuyentes.email}, EXCLUDED.email)`,
                  updatedAt: new Date(),
                },
              })
              .returning({ id: contribuyentes.id });
            if (ins) {
              if (!contribuyentesByKey.has(_key)) contribuyentesCreados++;
              contribuyentesByKey.set(_key, ins.id);
            }
          } catch (innerErr) {
            const msg =
              innerErr instanceof Error ? innerErr.message : String(innerErr);
            appendError("N/A", 0, `error_contribuyente (${vals.nit}): ${msg}`);
            errores++;
          }
        }
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(
          `\n⚠️  Lote contribuyentes ${bi + 1} falló (fallback individual): ${msg}\n`,
        );
      }
    }

    process.stdout.write("\r" + " ".repeat(80) + "\r");
    console.log(`✅ Contribuyentes nuevos: ${contribuyentesCreados.toLocaleString()}`);
  }

  // ── Fase 1b: Actualizar email de contribuyentes existentes sin email ──────
  {
    interface EmailUpdate {
      id: number;
      nit: string;
      tipoDocumento: TipoDocumento;
      emailNuevo: string;
    }

    const toUpdate = new Map<string, EmailUpdate>();

    for (const fila of filas) {
      if (!fila.correo) continue;
      const cKey = contribuyenteKey(fila.tipoId, fila.idPropietario);
      // Solo contribuyentes que ya existían en BD antes de esta ejecución
      if (!originalContribuyentesKeys.has(cKey)) continue;
      // Solo si no tienen email registrado
      if (contribuyentesEmailMap.get(cKey)) continue;
      // Primer email encontrado en el CSV para este contribuyente
      if (toUpdate.has(cKey)) continue;
      toUpdate.set(cKey, {
        id: contribuyentesByKey.get(cKey)!,
        nit: fila.idPropietario,
        tipoDocumento: fila.tipoId,
        emailNuevo: fila.correo,
      });
    }

    if (toUpdate.size === 0) {
      console.log(`📧 Sin contribuyentes existentes con email pendiente de actualizar`);
    } else {
      console.log(
        `📧 Contribuyentes a actualizar email: ${toUpdate.size.toLocaleString()}`,
      );

      let emailsActualizados = 0;

      await runWithConcurrency(
        [...toUpdate.values()].map((item) => async () => {
          try {
            await db
              .update(contribuyentes)
              .set({ email: item.emailNuevo, updatedAt: new Date() })
              .where(eq(contribuyentes.id, item.id));
            emailsActualizados++;
            appendActualizado(item.nit, item.tipoDocumento, item.emailNuevo);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            appendError(
              "N/A",
              0,
              `error_actualizar_email (${item.nit}): ${msg}`,
            );
            errores++;
          }
        }),
        CONCURRENCY,
      );

      console.log(`✅ Emails actualizados: ${emailsActualizados.toLocaleString()}`);
    }
  }

  // ── Fase 2: Upsert masivo de vehículos ────────────────────────────────────
  {
    type VehiculoInsert = typeof vehiculos.$inferInsert & { _placa: string };
    const toInsert = new Map<string, VehiculoInsert>();

    for (const fila of filas) {
      const placa = fila.placa.toUpperCase();
      const contribuyenteId = contribuyentesByKey.get(
        contribuyenteKey(fila.tipoId, fila.idPropietario),
      );
      if (vehiculosByPlaca.has(placa) || toInsert.has(placa)) continue;
      if (contribuyenteId === undefined) continue; // contribuyente falló
      toInsert.set(placa, {
        _placa: placa,
        contribuyenteId,
        placa,
        modelo: fila.modelo,
        clase: fila.clase || null,
        marca: fila.marca || null,
        linea: fila.linea || null,
        cilindraje: fila.cilindraje,
      });
    }

    const batches = chunk([...toInsert.values()], BATCH_SIZE);
    console.log(
      `🚗 Vehículos nuevos a insertar: ${toInsert.size.toLocaleString()} en ${batches.length} lotes`,
    );

    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi]!;
      process.stdout.write(
        `\r   Vehículos: lote ${bi + 1}/${batches.length}...`,
      );
      try {
        const result = await db
          .insert(vehiculos)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .values(batch.map(({ _placa, ...vals }) => vals))
          .onConflictDoUpdate({
            target: [vehiculos.placa],
            set: { actualizadoEn: new Date() },
          })
          .returning({ id: vehiculos.id, placa: vehiculos.placa });

        for (const r of result) {
          const p = r.placa.toUpperCase();
          if (!vehiculosByPlaca.has(p)) vehiculosCreados++;
          vehiculosByPlaca.set(p, r.id);
        }
      } catch (err) {
        for (const { _placa, ...vals } of batch) {
          try {
            const [ins] = await db
              .insert(vehiculos)
              .values(vals)
              .onConflictDoUpdate({
                target: [vehiculos.placa],
                set: { actualizadoEn: new Date() },
              })
              .returning({ id: vehiculos.id });
            if (ins) {
              if (!vehiculosByPlaca.has(_placa)) vehiculosCreados++;
              vehiculosByPlaca.set(_placa, ins.id);
            }
          } catch (innerErr) {
            const msg =
              innerErr instanceof Error ? innerErr.message : String(innerErr);
            appendError(_placa, 0, `error_vehiculo: ${msg}`);
            errores++;
          }
        }
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(
          `\n⚠️  Lote vehículos ${bi + 1} falló (fallback individual): ${msg}\n`,
        );
      }
    }

    process.stdout.write("\r" + " ".repeat(80) + "\r");
    console.log(`✅ Vehículos nuevos: ${vehiculosCreados.toLocaleString()}`);
  }

  // ── Fase 3: Recolectar + insertar impuestos en paralelo ──────────────────
  const impuestosAInsertar: ImpuestoToInsert[] = [];

  for (const fila of filas) {
    const contribuyenteId = contribuyentesByKey.get(
      contribuyenteKey(fila.tipoId, fila.idPropietario),
    );
    if (contribuyenteId === undefined) continue;

    const vehiculoId = vehiculosByPlaca.get(fila.placa.toUpperCase());
    if (vehiculoId === undefined) continue;

    for (const año of AÑOS) {
      const { capital, interes } = fila.montos[año]!;
      if (capital <= 0) continue;

      const iKey = impuestoKey(fila.placa.toUpperCase(), año);
      if (impuestosExistentes.has(iKey)) {
        omitidosYaEnBd++;
        appendOmitido(fila.placa.toUpperCase(), año, "ya_en_bd");
        continue;
      }
      // Reservar la clave para evitar duplicados dentro del mismo CSV
      impuestosExistentes.add(iKey);
      impuestosAInsertar.push({
        placa: fila.placa.toUpperCase(),
        año,
        contribuyenteId,
        vehiculoId,
        capital,
        interes,
      });
    }
  }

  console.log(
    `📋 Impuestos a insertar: ${impuestosAInsertar.length.toLocaleString()}`,
  );

  const impuestoBatches = chunk(impuestosAInsertar, IMPUESTO_BATCH_SIZE);
  const spinner = createProgressSpinner(impuestosAInsertar.length);
  let impuestosProcessed = 0;

  const impuestoTasks = impuestoBatches.map((batch) => async () => {
    try {
      await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(impuestos)
          .values(
            batch.map(({ contribuyenteId, vehiculoId, capital, interes, año }) => ({
              contribuyenteId,
              vehiculoId,
              tipoImpuesto: "vehicular" as const,
              vigencia: año,
              tipoPeriodo: "anual" as const,
              periodo: null,
              impuestoDeterminado: capital.toFixed(2),
              intereses: interes > 0 ? interes.toFixed(2) : "0",
              sanciones: "0",
              descuentos: "0",
              totalAPagar: (capital + interes).toFixed(2),
              estadoActual: "pendiente" as const,
              asignadoAId: null,
              fechaVencimiento: null,
              fechaDeclaracion: null,
              noExpediente: null,
              observaciones: null,
            })),
          )
          .returning({ id: impuestos.id });

        await tx.insert(historialImpuesto).values(
          inserted.map((r, idx) => ({
            impuestoId: r.id,
            usuarioId: null,
            tipoEvento: "cambio_estado" as const,
            estadoAnterior: null,
            estadoNuevo: "pendiente" as const,
            comentario: `Importado desde cartera vehicular. Placa: ${batch[idx]!.placa}, Vigencia: ${batch[idx]!.año}`,
          })),
        );

        impuestosCreados += inserted.length;
      });
    } catch (batchErr) {
      // Fallback fila a fila
      const msg =
        batchErr instanceof Error ? batchErr.message : String(batchErr);
      process.stderr.write(`\n⚠️  Lote impuestos falló (fallback individual): ${msg}\n`);

      for (const row of batch) {
        try {
          await db.transaction(async (tx) => {
            const [ins] = await tx
              .insert(impuestos)
              .values({
                contribuyenteId: row.contribuyenteId,
                vehiculoId: row.vehiculoId,
                tipoImpuesto: "vehicular",
                vigencia: row.año,
                tipoPeriodo: "anual",
                periodo: null,
                impuestoDeterminado: row.capital.toFixed(2),
                intereses: row.interes > 0 ? row.interes.toFixed(2) : "0",
                sanciones: "0",
                descuentos: "0",
                totalAPagar: (row.capital + row.interes).toFixed(2),
                estadoActual: "pendiente",
                asignadoAId: null,
                fechaVencimiento: null,
                fechaDeclaracion: null,
                noExpediente: null,
                observaciones: null,
              })
              .returning({ id: impuestos.id });

            if (!ins) throw new Error("Sin resultado en insert impuesto");

            await tx.insert(historialImpuesto).values({
              impuestoId: ins.id,
              usuarioId: null,
              tipoEvento: "cambio_estado",
              estadoAnterior: null,
              estadoNuevo: "pendiente",
              comentario: `Importado desde cartera vehicular. Placa: ${row.placa}, Vigencia: ${row.año}`,
            });

            impuestosCreados++;
          });
        } catch (innerErr) {
          const innerMsg =
            innerErr instanceof Error ? innerErr.message : String(innerErr);
          appendError(row.placa, row.año, innerMsg);
          errores++;
        }
      }
    }

    impuestosProcessed += batch.length;
    spinner.update(impuestosProcessed);
  });

  await runWithConcurrency(impuestoTasks, CONCURRENCY);
  spinner.stop();

  console.log(`✅ Impuestos creados: ${impuestosCreados.toLocaleString()}`);
  if (omitidosYaEnBd > 0)
    console.log(`⏭  Omitidos (ya en BD): ${omitidosYaEnBd.toLocaleString()}`);
  if (errores > 0) console.log(`❌ Errores: ${errores.toLocaleString()}`);
  if (errorFileCreado) console.log(`📁 Errores en: ${errorFilePath}`);
  if (omitidosFileCreado) console.log(`📁 Omitidos en: ${omitidosFilePath}`);
  if (actualizadosFileCreado)
    console.log(`📁 Emails actualizados en: ${actualizadosFilePath}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌", err);
    process.exit(1);
  });
