-- Migrar datos desde procesos a ordenes_resolucion y cobros_coactivos
-- Solo insertar donde existan datos (numero_resolucion o fecha_resolucion; fecha_inicio_cobro_coactivo)

INSERT INTO "ordenes_resolucion" ("proceso_id", "numero_resolucion", "fecha_resolucion", "creado_en", "actualizado_en")
SELECT id, COALESCE(NULLIF(TRIM("numero_resolucion"), ''), 'N/A'), "fecha_resolucion", "creado_en", "actualizado_en"
FROM "procesos"
WHERE "numero_resolucion" IS NOT NULL AND TRIM("numero_resolucion") <> ''
   OR "fecha_resolucion" IS NOT NULL
ON CONFLICT ("proceso_id") DO NOTHING;

INSERT INTO "cobros_coactivos" ("proceso_id", "fecha_inicio", "creado_en", "actualizado_en")
SELECT id, "fecha_inicio_cobro_coactivo", "creado_en", "actualizado_en"
FROM "procesos"
WHERE "fecha_inicio_cobro_coactivo" IS NOT NULL
ON CONFLICT ("proceso_id") DO NOTHING;
