# Para revisión y seguimiento

Espacio para anotar pendientes y revisiones sobre la importación de cartera de comparendos.

---

## Checklist antes de una nueva importación

- [ ] CSV de cartera actualizado en la ruta configurada (p. ej. `ReporteCarteraActual.csv`)
- [ ] `DATABASE_URL` correcta en `.env`
- [ ] Revisar si se desea ejecutar antes `import-cartera-resumen.ts` (solo preview)

---

## Después de importar

- [ ] Revisar logs: procesos creados, omitidos por motivo (ya_en_bd, duplicado_en_csv, vigencia_invalida, error_contribuyente)
- [ ] Revisar archivos en `import-cartera-output/` si hubo omitidos o errores
- [ ] Ejecutar `verificar:montos` con el CSV original y el archivo de omitidos/vigencia generado
- [ ] Si hay duda sobre diferencias de monto, ejecutar `comparar-cartera-db-csv.ts` y revisar `resultados.md`

---

## Notas / incidencias

*(Anotar aquí fechas y observaciones.)*

- 2026-02-21: Verificación y comparación realizadas. Diferencia explicada por 4 filas duplicadas en CSV (suma 6.437.326). Sin errores de datos.

---

## Actualizar resultados

Cuando se vuelva a ejecutar verificación o comparación con datos nuevos:

1. Ejecutar los comandos indicados en `README.md` (sección 9).
2. Actualizar `resultados.md` con las nuevas cifras y la fecha de ejecución.
3. Si aplica, anotar en "Notas / incidencias" arriba.
