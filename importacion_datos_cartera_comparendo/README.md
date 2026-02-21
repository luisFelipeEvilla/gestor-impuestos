# Importación de datos: cartera de comparendos (Tránsito)

Documentación del proceso de importación del reporte de cartera de tránsito desde CSV a la base de datos, scripts de verificación y resultados.

---

## 1. Contexto

- **Origen:** archivo CSV (p. ej. `ReporteCarteraActual.csv`) con comparendos de tránsito.
- **Destino:** impuesto "Comparendos de tránsito" en BD: se crean o reutilizan **contribuyentes** (por documento) y **procesos** asociados.
- **Objetivo:** cargar la cartera de forma **idempotente** (re-ejecutar no duplica registros) y dejar trazabilidad de lo omitido (vigencia inválida, ya en BD, duplicado en CSV, error contribuyente).

---

## 2. Clave de unicidad (idempotencia)

Un proceso se considera el mismo que una fila del CSV si comparten la **clave de idempotencia**:

```
no_comparendo | fecha_aplicacion | valor_multa (2 decimales) | no_documento_infractor
```

- **fecha_aplicacion:** fecha comparendo, o en su defecto fecha resolución (formato ISO `YYYY-MM-DD`).
- **valor_multa:** Valor Deuda o Valor Multa del CSV, normalizado con `.toFixed(2)`.

Si una fila tiene la misma clave que un proceso ya existente en BD → se omite (**ya_en_bd**).  
Si una fila repite una clave ya vista en el mismo CSV → se omite (**duplicado_en_csv**).

---

## 3. Scripts involucrados

| Script | Uso | Descripción |
|--------|-----|-------------|
| `scripts/import-cartera-transito.ts` | `pnpm run import:cartera [ruta.csv]` | Importación por lotes (1000). Crea contribuyentes y procesos. Escribe en `import-cartera-output/`: errores, omitidos, vigencia inválida. |
| `scripts/import-cartera-resumen.ts` | `pnpm exec tsx scripts/import-cartera-resumen.ts [ruta.csv]` | Vista previa sin insertar: mismos criterios de clave y vigencia. |
| `scripts/verificar-montos-cartera.ts` | `pnpm run verificar:montos` o con args | Suma montos: CSV original, BD Tránsito, CSV omitidos (solo vigencia inválida si tiene columna `motivo`). Comprueba cuadre. |
| `scripts/comparar-cartera-db-csv.ts` | `pnpm exec tsx scripts/comparar-cartera-db-csv.ts [csv-original] [csv-vigencia]` | Compara cada fila del CSV con BD y archivo vigencia inválida. Categoriza filas y explica la diferencia de montos (duplicados). |
| `scripts/verificar-duplicados-csv.ts` | `pnpm exec tsx scripts/verificar-duplicados-csv.ts [csv]` | Lista duplicados por Nro Comparendo en el CSV. |
| `scripts/diagnostico-procesos-duplicados.ts` | (ejecutar con tsx) | Diagnóstico de procesos duplicados en BD por `no_comparendo`. |
| `scripts/limpiar-procesos-duplicados.ts` | (ejecutar con tsx, soporta `--dry-run`) | Limpieza de duplicados en BD (excepto lógica especial "NO REPORTADO"). |

**Variables de entorno:** `DATABASE_URL` (y opcionalmente `CARTERA_CSV_PATH` para la importación).

---

## 4. Archivos de salida de la importación

La carpeta **`import-cartera-output/`** (en `.gitignore`) se crea al ejecutar la importación. Contiene:

- **`import-cartera-omitidos-YYYY-MM-DD-HH-MM-SS.csv`**  
  Todas las filas omitidas, con una columna extra `motivo`: `ya_en_bd`, `duplicado_en_csv`, `vigencia_invalida`, `error_contribuyente`.

- **`import-cartera-vigencia-invalida-YYYY-MM-DD-HH-MM-SS.csv`**  
  Solo las filas omitidas por vigencia inválida (año &lt; 2000 o &gt; 2100).

- **`import-cartera-errores-...`**  
  Filas que fallaron en la inserción (p. ej. error en batch).

Los archivos de omitidos y vigencia inválida pueden estar también en la raíz del proyecto si se copiaron para análisis (p. ej. `import-cartera-vigencia-invalida-2026-02-21-12-15-15.csv`).

---

## 5. Criterios de omisión

- **vigencia_invalida:** año de la fecha de aplicación &lt; 2000 o &gt; 2100.
- **ya_en_bd:** la clave de idempotencia ya existe en procesos del impuesto Tránsito.
- **duplicado_en_csv:** la misma clave ya apareció en una fila anterior del mismo CSV.
- **error_contribuyente:** no se pudo crear o obtener el contribuyente (p. ej. documento inválido).

---

## 6. Verificación de montos

**Objetivo:** comprobar que la suma de montos (BD + omitidos) sea coherente con el CSV.

- **Solo vigencia inválida:**  
  `pnpm run verificar:montos -- ReporteCarteraActual.csv import-cartera-vigencia-invalida-2026-02-21-12-15-15.csv`  
  Suma BD + suma (solo filas con `motivo = vigencia_invalida`). No se espera igualdad con el CSV si hay otros omitidos.

- **Cuadre total:**  
  Si se pasa el archivo **completo** de omitidos, el script usa la suma de todos los omitidos y comprueba:  
  `sum(BD) + sum(todos los omitidos) = sum(CSV)`.

---

## 7. Comparación BD vs CSV

**Objetivo:** ver por qué `sum(BD) + sum(vigencia inválida)` no coincide con `sum(CSV)`.

El script **`comparar-cartera-db-csv.ts`**:

1. Parsea el CSV original y el de vigencia inválida con la **misma lógica de clave** que la importación.
2. Carga de BD todos los procesos de Tránsito (clave + monto).
3. Clasifica cada fila del CSV en: **en_bd** (clave en BD), **vigencia** (clave en archivo vigencia), **otro** (ninguno).
4. Comprueba si hay diferencias de monto entre BD y la primera ocurrencia de cada clave en el CSV.
5. Cuantifica las filas duplicadas en el CSV (misma clave que ya está en BD) y muestra que su suma es la diferencia.

Conclusión típica: la diferencia no es un error de datos; son **filas duplicadas en el CSV** (misma clave que un proceso ya cargado). Esas filas suman el faltante entre `sum(CSV)` y `sum(BD) + sum(vigencia)`.

---

## 8. Resumen de resultados

Ver el archivo **`resultados.md`** en esta misma carpeta. Incluye:

- **Cifras clave:** cantidad de procesos con vigencia inválida (1.126), cantidad sin número de comparendo ("NO REPORTADO"), suma de montos de vigencia inválida.
- **Todos los hallazgos:** listado consolidado (vigencia inválida, duplicados en CSV, categorización, cuadre).
- **Por qué los números no coinciden:** explicación de la diferencia (4 filas duplicadas en el CSV que suman 6.437.326) y de las pequeñas variaciones entre ejecuciones (redondeo / momento de consulta).

---

## 9. Referencia rápida de comandos

```bash
# Importar cartera (por defecto ReporteCarteraActual.csv)
pnpm run import:cartera
pnpm run import:cartera -- ruta/otro.csv

# Verificar montos (solo vigencia inválida)
pnpm run verificar:montos -- ReporteCarteraActual.csv import-cartera-vigencia-invalida-2026-02-21-12-15-15.csv

# Comparar BD vs CSV y vigencia (explicación de diferencia)
pnpm exec tsx scripts/comparar-cartera-db-csv.ts ReporteCarteraActual.csv import-cartera-vigencia-invalida-2026-02-21-12-15-15.csv

# Preview sin insertar
pnpm exec tsx scripts/import-cartera-resumen.ts ReporteCarteraActual.csv
```
