-- Elimina la relación de procesos con impuestos.
ALTER TABLE "procesos" DROP COLUMN IF EXISTS "impuesto_id";
