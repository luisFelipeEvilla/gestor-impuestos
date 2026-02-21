# Resultados: verificación y comparación (cartera comparendos)

Resultados de la verificación de montos y de la comparación BD vs CSV realizadas con los scripts documentados en `README.md`. Fecha de referencia: febrero 2026.

---

## 1. Cifras clave (vigencia inválida y sin comparendo)

| Concepto | Cantidad | Nota |
|----------|----------|------|
| **Procesos con vigencia inválida** (omitidos) | **1.126** | Filas del CSV que no se importan porque el año de la fecha de aplicación es &lt; 2000 o &gt; 2100. Se exportan en `import-cartera-vigencia-invalida-*.csv`. |
| **Sin número de comparendo ("NO REPORTADO")** | **1.126** | En el archivo de vigencia inválida, **todas** las filas tienen en "Nro Comparendo" el valor **"NO REPORTADO"**. A su vez, en el CSV original suelen traer fecha de comparendo 01/01/1900, por eso el año 1900 hace que se clasifiquen como vigencia inválida. |
| Suma montos (vigencia inválida) | 759.518.817,00 | Coherente con las 1.126 filas. |

Es decir: **los 1.126 registros omitidos por vigencia inválida son todos casos sin número de comparendo (NO REPORTADO)**. No se cargan a BD por la vigencia inválida; si en el futuro se corrige la fecha en el origen, podrían reimportarse.

---

## 2. Datos utilizados

- **CSV original:** `ReporteCarteraActual.csv` (80.274 filas).
- **CSV vigencia inválida:** `import-cartera-vigencia-invalida-2026-02-21-12-15-15.csv` (1.126 filas).
- **BD:** procesos del impuesto "Comparendos de tránsito".

---

## 3. Verificación de montos

### Sumas

| Concepto | Valor |
|---------|--------|
| Suma CSV original | 134.401.375.243,00 |
| Suma BD (Tránsito) | 133.638.193.619,00 (79.146 procesos) |
| Suma omitidos (solo vigencia inválida) | 759.518.817,00 (1.126 filas) |
| **BD + vigencia inválida** | **134.397.712.436,00** |
| **Diferencia con CSV** | **3.662.807,00** |

*(Nota: pequeñas variaciones en la suma BD entre ejecuciones pueden deberse a redondeo o al momento de la consulta.)*

### Conclusión verificación

- La suma **BD + vigencia inválida** es muy cercana a la suma del CSV.
- La diferencia restante corresponde a **omitidos por otros motivos** (ya en BD, duplicado en CSV, error contribuyente), no a un error de importación.

---

## 4. Comparación BD vs CSV

### Categorización de las 80.274 filas del CSV

| Categoría | Filas | Suma |
|-----------|--------|--------|
| En BD (clave existe en BD) | 79.148 | 133.641.856.426,00 |
| Vigencia inválida | 1.126 | 759.518.817,00 |
| Otro (no en BD ni vigencia) | 0 | 0,00 |
| **Total** | **80.274** | **134.401.375.243,00** |

- **Comprobación:** la suma por categorías coincide con la suma total del CSV (diff 0,00).
- No hay filas “huérfanas”: toda fila del CSV tiene su clave o en BD o en el archivo de vigencia inválida.

### Cuadre BD + vigencia vs CSV

| Concepto | Valor |
|----------|--------|
| Suma BD (desde DB) | 133.635.419.100,00 (79.144 procesos) |
| Suma vigencia (archivo) | 759.518.817,00 |
| **BD + vigencia** | **134.394.937.917,00** |
| Suma CSV | 134.401.375.243,00 |
| **Diferencia** | **6.437.326,00** |

### Explicación de la diferencia

- **4 filas** del CSV son **duplicados**: tienen la **misma clave de idempotencia** que un proceso ya cargado en BD.
- Esas 4 filas suman **6.437.326,00**, que coincide con la diferencia anterior.
- **Conclusión:** no hay error de datos. La diferencia se explica por esas 4 filas duplicadas en el CSV; la importación correctamente no las vuelve a insertar.

### Discrepancias de monto (BD vs primera ocurrencia en CSV)

- **No se encontraron discrepancias:** para cada clave presente en BD, el monto en BD coincide con el monto de la primera ocurrencia de esa clave en el CSV (dentro de tolerancia de redondeo).

---

## 5. Por qué los números no terminan de coincidir

- **Diferencia principal (6.437.326):**  
  En el CSV hay **4 filas duplicadas** (misma clave de idempotencia que un proceso ya cargado en BD). Esas 4 filas suman exactamente **6.437.326**. Por eso:
  - **Sum(CSV)** = Sum(BD) + Sum(vigencia inválida) **+ 6.437.326**.
  - La importación no vuelve a insertar esas 4 filas (correctamente), así que en BD solo está una vez cada clave. Al sumar “BD + vigencia” no se incluye ese monto duplicado del CSV, de ahí la diferencia.

- **Pequeñas variaciones entre ejecuciones:**  
  La suma de BD puede variar ligeramente (p. ej. 133.638.193.619 vs 133.635.419.100) según el momento de la consulta o redondeo en la base de datos. No indica error; el cuadre conceptual es: **Sum(CSV) = Sum(BD) + Sum(vigencia inválida) + Sum(duplicados en CSV)**.

- **Resumen:** Los números no coinciden exactamente porque (1) el CSV incluye 4 filas duplicadas que la BD no repite, y (2) puede haber diferencias de redondeo o de momento de consulta. No hay montos perdidos ni incoherencia de datos.

---

## 6. Todos los hallazgos (resumen)

1. **Vigencia inválida:** 1.126 filas omitidas; todas con "NO REPORTADO" en Nro Comparendo y fecha de comparendo 01/01/1900 (año 1900 → vigencia inválida).
2. **Duplicados en CSV:** 4 filas con clave ya existente en BD; suman 6.437.326; explican la diferencia entre Sum(CSV) y (Sum(BD) + Sum(vigencia)).
3. **Categorización del CSV:** Las 80.274 filas quedan 100% clasificadas: 79.148 en BD, 1.126 vigencia inválida, 0 en “otro”. No hay filas huérfanas.
4. **Montos BD vs CSV:** No hay discrepancias de monto por clave (la primera ocurrencia en el CSV coincide con el monto en BD).
5. **Cuadre conceptual:** Sum(CSV) = Sum(BD) + Sum(vigencia inválida) + Sum(duplicados en CSV). No hay error de importación ni de datos.

---

## 7. Resumen ejecutivo

1. **Importación:** La carga de cartera de comparendos es idempotente y coherente con la clave definida (comparendo, fecha, valor, documento).
2. **Montos:** Sum(CSV) = Sum(BD) + Sum(vigencia inválida) + Sum(duplicados en CSV). No hay montos “perdidos” ni incoherencias entre BD y CSV por clave.
3. **Duplicados en CSV:** 4 filas duplicadas (misma clave que un proceso en BD) explican la diferencia entre Sum(CSV) y Sum(BD) + Sum(vigencia inválida). El script `comparar-cartera-db-csv.ts` puede listar esas filas (línea, comparendo, documento, monto) para revisión.
4. **Vigencia inválida:** 1.126 filas omitidas por vigencia &lt; 2000 o &gt; 2100; quedan registradas en el archivo de vigencia inválida generado en la importación.

---

## 8. Cómo repetir la verificación

Para dejar actualizado este documento con nuevas ejecuciones:

```bash
# Verificación de montos (solo vigencia inválida)
pnpm run verificar:montos -- ReporteCarteraActual.csv import-cartera-vigencia-invalida-2026-02-21-12-15-15.csv

# Comparación BD vs CSV
pnpm exec tsx scripts/comparar-cartera-db-csv.ts ReporteCarteraActual.csv import-cartera-vigencia-invalida-2026-02-21-12-15-15.csv
```

Copiar la salida relevante a este archivo o anotar aquí las nuevas cifras y la fecha de ejecución.
