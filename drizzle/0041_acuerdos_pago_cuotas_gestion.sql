-- Gestión de cuotas en acuerdos de pago: porcentaje cuota inicial, número de cuotas, día del mes de cobro
--> statement-breakpoint
ALTER TABLE "acuerdos_pago" ADD COLUMN IF NOT EXISTS "porcentaje_cuota_inicial" numeric(5, 2);
--> statement-breakpoint
ALTER TABLE "acuerdos_pago" ADD COLUMN IF NOT EXISTS "dia_cobro_mes" integer;
--> statement-breakpoint
-- Valores por defecto para registros existentes
UPDATE "acuerdos_pago" SET "porcentaje_cuota_inicial" = 100 WHERE "porcentaje_cuota_inicial" IS NULL;
--> statement-breakpoint
UPDATE "acuerdos_pago" SET "dia_cobro_mes" = 1 WHERE "dia_cobro_mes" IS NULL;
--> statement-breakpoint
UPDATE "acuerdos_pago" SET "cuotas" = 1 WHERE "cuotas" IS NULL;
--> statement-breakpoint
ALTER TABLE "acuerdos_pago" ALTER COLUMN "porcentaje_cuota_inicial" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "acuerdos_pago" ALTER COLUMN "dia_cobro_mes" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "acuerdos_pago" ALTER COLUMN "cuotas" SET NOT NULL;
