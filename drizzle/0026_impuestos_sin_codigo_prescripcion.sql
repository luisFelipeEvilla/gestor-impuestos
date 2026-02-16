-- Quitar código de impuestos y añadir tiempo de prescripción en meses
ALTER TABLE "impuestos" DROP COLUMN IF EXISTS "codigo";
ALTER TABLE "impuestos" ADD COLUMN IF NOT EXISTS "prescripcion_meses" integer;
