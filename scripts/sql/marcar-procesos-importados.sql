-- Agrega columnas de importación a procesos y marca todos los registros actuales como importados.
-- Ejecutar una sola vez contra la BD (psql, DBeaver, o desde el cliente que uses).
--
-- Uso: psql $DATABASE_URL -f scripts/sql/marcar-procesos-importados.sql

-- 1) Agregar columna importado si no existe
ALTER TABLE procesos
ADD COLUMN IF NOT EXISTS importado BOOLEAN NOT NULL DEFAULT false;

-- 2) Agregar columna fecha_importacion si no existe
ALTER TABLE procesos
ADD COLUMN IF NOT EXISTS fecha_importacion TIMESTAMPTZ;

-- 3) Marcar todos los procesos actuales como importados y asignar fecha de importación
UPDATE procesos
SET
  importado = true,
  fecha_importacion = COALESCE(fecha_importacion, now())
WHERE importado = false OR fecha_importacion IS NULL;
