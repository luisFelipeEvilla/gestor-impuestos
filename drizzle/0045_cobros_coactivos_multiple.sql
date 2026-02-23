-- Permitir múltiples cobros coactivos por proceso (1:N en lugar de 1:1).
-- 1. Agregar columna "activo" (boolean, default true).
ALTER TABLE "cobros_coactivos" ADD COLUMN "activo" boolean NOT NULL DEFAULT true;

-- 2. Marcar todos los registros existentes como activos.
UPDATE "cobros_coactivos" SET "activo" = true;

-- 3. Eliminar la restricción de unicidad sobre proceso_id.
ALTER TABLE "cobros_coactivos" DROP CONSTRAINT IF EXISTS "cobros_coactivos_proceso_id_unique";
