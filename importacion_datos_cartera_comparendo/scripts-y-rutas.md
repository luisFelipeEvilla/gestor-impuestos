# Scripts y rutas de archivos

Referencia rápida de ubicaciones y comandos.

## Scripts (en `scripts/`)

| Archivo | Comando npm / ejecución |
|---------|--------------------------|
| `import-cartera-transito.ts` | `pnpm run import:cartera` |
| `import-cartera-resumen.ts` | `pnpm exec tsx scripts/import-cartera-resumen.ts [csv]` |
| `verificar-montos-cartera.ts` | `pnpm run verificar:montos` o con args |
| `comparar-cartera-db-csv.ts` | `pnpm exec tsx scripts/comparar-cartera-db-csv.ts [csv-original] [csv-vigencia]` |
| `verificar-duplicados-csv.ts` | `pnpm exec tsx scripts/verificar-duplicados-csv.ts [csv]` |
| `diagnostico-procesos-duplicados.ts` | `pnpm exec tsx scripts/diagnostico-procesos-duplicados.ts` |
| `limpiar-procesos-duplicados.ts` | `pnpm exec tsx scripts/limpiar-procesos-duplicados.ts [--dry-run]` |

## Rutas típicas

| Qué | Ruta |
|-----|------|
| CSV cartera por defecto | `ReporteCarteraActual.csv` (raíz del proyecto) |
| Salida de importación (omitidos, vigencia, errores) | `import-cartera-output/` (en `.gitignore`) |
| Ejemplo omitidos completo | `import-cartera-omitidos-2026-02-21-12-15-14.csv` |
| Ejemplo vigencia inválida | `import-cartera-vigencia-invalida-2026-02-21-12-15-15.csv` |

## Variables de entorno

- `DATABASE_URL` — obligatoria para importación, verificación y comparación.
- `CARTERA_CSV_PATH` — opcional; ruta por defecto del CSV en la importación.
