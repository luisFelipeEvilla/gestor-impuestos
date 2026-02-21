ALTER TABLE "procesos" DROP CONSTRAINT IF EXISTS "procesos_impuesto_id_impuestos_id_fk";
--> statement-breakpoint
ALTER TABLE "acuerdos_pago" ALTER COLUMN "cuotas" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "acuerdos_pago" ADD COLUMN IF NOT EXISTS "porcentaje_cuota_inicial" numeric(5, 2) NOT NULL;
--> statement-breakpoint
ALTER TABLE "acuerdos_pago" ADD COLUMN IF NOT EXISTS "dia_cobro_mes" integer NOT NULL;
--> statement-breakpoint
ALTER TABLE "documentos_proceso" ADD COLUMN IF NOT EXISTS "subido_por_id" integer;
--> statement-breakpoint
ALTER TABLE "procesos" ADD COLUMN IF NOT EXISTS "monto_multa_cop" numeric(15, 2);
--> statement-breakpoint
ALTER TABLE "procesos" ADD COLUMN IF NOT EXISTS "monto_intereses_cop" numeric(15, 2);
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'documentos_proceso_subido_por_id_usuarios_id_fk') THEN ALTER TABLE "documentos_proceso" ADD CONSTRAINT "documentos_proceso_subido_por_id_usuarios_id_fk" FOREIGN KEY ("subido_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade; END IF; END $$;
--> statement-breakpoint
ALTER TABLE "procesos" DROP COLUMN IF EXISTS "impuesto_id";
