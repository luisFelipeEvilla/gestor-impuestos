# Actualizar multa e intereses desde CSV

Esta carpeta contiene la documentación y los hallazgos del script que actualiza los campos **monto_multa_cop** y **monto_intereses_cop** de los procesos a partir del reporte de cartera (CSV).

## Script

- **Ubicación:** `scripts/actualizar-multa-intereses-desde-csv.ts`
- **Uso:**  
  `pnpm exec tsx scripts/actualizar-multa-intereses-desde-csv.ts [ruta.csv] [--dry-run]`  
  Sin argumentos usa `ReporteCarteraActual.csv` en la raíz del proyecto.

## Qué hace el script

1. Lee el CSV de cartera (columnas Valor Multa, Valor Interés(es), Valor Deuda).
2. Para cada fila que coincide con un proceso en BD (por número de comparendo, fecha de aplicación, monto total y NIT), comprueba:
   - **Condición:** `valor deuda = valor multa + valor intereses` (con tolerancia 0,01 COP).
3. Solo si la condición se cumple, actualiza en BD `monto_multa_cop` y `monto_intereses_cop`.
4. Las filas donde **no coincide la suma** (valor deuda ≠ multa + intereses) no se actualizan y se guardan en un CSV en esta carpeta.

## Archivos generados en esta carpeta

| Archivo | Descripción |
|--------|--------------|
| `no-coinciden-YYYY-MM-DD-HHmmss.csv` | Filas del CSV de cartera en las que la suma *multa + intereses* no coincide con *valor deuda* (tolerancia 0,01). Sirve para revisión manual o corrección en origen. |

El nombre del archivo incluye fecha y hora de la ejecución para no sobrescribir ejecuciones anteriores.

## Columnas del CSV de hallazgos

| Columna | Descripción |
|---------|-------------|
| linea | Número de línea en el CSV de cartera original |
| key | Clave de idempotencia: `nro_comparendo\|fecha_aplicacion\|monto_cop\|nit` |
| valor_multa | Valor Multa leído del CSV (texto) |
| valor_intereses | Valor Intereses leído del CSV (texto) |
| valor_deuda | Valor Deuda leído del CSV (texto) |
| suma_multa_mas_intereses | multa + intereses (numérico) |
| valor_deuda_numerico | Valor Deuda parseado (numérico) |
| diferencia | valor_deuda - suma (para ver si sobra o falta) |

Separador: punto y coma (`;`).

## Requisitos

- `DATABASE_URL` en `.env`.
- CSV de cartera con columnas normalizadas (sin tildes): Nro Comparendo, Fecha Comparendo, Fecha Resolución, Identificacion Infractor, Valor Multa, Valor Intereses o Valor Interes, Valor Deuda.
