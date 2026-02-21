ALTER TABLE "procesos" ADD COLUMN IF NOT EXISTS "monto_multa_cop" numeric(15, 2);
ALTER TABLE "procesos" ADD COLUMN IF NOT EXISTS "monto_intereses_cop" numeric(15, 2);
