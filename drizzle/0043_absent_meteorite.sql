-- tipo_documento_proceso: crear solo si no existe (idempotente para despliegues)
DO $$ BEGIN
  CREATE TYPE "public"."tipo_documento_proceso" AS ENUM('orden_resolucion', 'mandamiento_pago', 'acta_notificacion', 'acuerdo_pago_firmado', 'liquidacion', 'medidas_cautelares', 'resolucion_incumplimiento', 'auto_terminacion', 'constancia_pago', 'otro');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "cobros_coactivos" DROP CONSTRAINT IF EXISTS "cobros_coactivos_proceso_id_unique";
--> statement-breakpoint
ALTER TABLE "historial_proceso" ALTER COLUMN "estado_anterior" SET DATA TYPE text;
--> statement-breakpoint
ALTER TABLE "historial_proceso" ALTER COLUMN "estado_nuevo" SET DATA TYPE text;
--> statement-breakpoint
ALTER TABLE "procesos" ALTER COLUMN "estado_actual" SET DATA TYPE text;
--> statement-breakpoint
ALTER TABLE "procesos" ALTER COLUMN "estado_actual" SET DEFAULT 'pendiente'::text;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."estado_proceso";
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."estado_proceso" AS ENUM('pendiente', 'asignado', 'facturacion', 'acuerdo_pago', 'en_cobro_coactivo', 'finalizado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
-- Mapear valores antiguos del enum a los nuevos (historial_proceso puede tener notificado, en_contacto, etc.)
UPDATE "historial_proceso"
SET
  "estado_anterior" = CASE
    WHEN "estado_anterior" IN ('notificado', 'en_contacto') THEN 'facturacion'
    WHEN "estado_anterior" = 'en_negociacion' THEN 'acuerdo_pago'
    WHEN "estado_anterior" IN ('cobrado', 'incobrable', 'suspendido') THEN 'finalizado'
    ELSE "estado_anterior"
  END,
  "estado_nuevo" = CASE
    WHEN "estado_nuevo" IN ('notificado', 'en_contacto') THEN 'facturacion'
    WHEN "estado_nuevo" = 'en_negociacion' THEN 'acuerdo_pago'
    WHEN "estado_nuevo" IN ('cobrado', 'incobrable', 'suspendido') THEN 'finalizado'
    ELSE "estado_nuevo"
  END
WHERE "estado_anterior" IN ('notificado', 'en_contacto', 'en_negociacion', 'cobrado', 'incobrable', 'suspendido')
   OR "estado_nuevo" IN ('notificado', 'en_contacto', 'en_negociacion', 'cobrado', 'incobrable', 'suspendido');
--> statement-breakpoint
-- procesos.estado_actual: mapear valores antiguos por si 0042 no se aplicó antes
UPDATE "procesos"
SET "estado_actual" = CASE
  WHEN "estado_actual" IN ('notificado', 'en_contacto') THEN 'facturacion'
  WHEN "estado_actual" = 'en_negociacion' THEN 'acuerdo_pago'
  WHEN "estado_actual" IN ('cobrado', 'incobrable', 'suspendido') THEN 'finalizado'
  ELSE "estado_actual"
END
WHERE "estado_actual" IN ('notificado', 'en_contacto', 'en_negociacion', 'cobrado', 'incobrable', 'suspendido');
--> statement-breakpoint
ALTER TABLE "historial_proceso" ALTER COLUMN "estado_anterior" SET DATA TYPE "public"."estado_proceso" USING "estado_anterior"::"public"."estado_proceso";
--> statement-breakpoint
ALTER TABLE "historial_proceso" ALTER COLUMN "estado_nuevo" SET DATA TYPE "public"."estado_proceso" USING "estado_nuevo"::"public"."estado_proceso";
--> statement-breakpoint
ALTER TABLE "procesos" ALTER COLUMN "estado_actual" SET DEFAULT 'pendiente'::"public"."estado_proceso";
--> statement-breakpoint
ALTER TABLE "procesos" ALTER COLUMN "estado_actual" SET DATA TYPE "public"."estado_proceso" USING "estado_actual"::"public"."estado_proceso";
--> statement-breakpoint
ALTER TABLE "cobros_coactivos" ADD COLUMN IF NOT EXISTS "activo" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "documentos_proceso" ADD COLUMN IF NOT EXISTS "tipo_documento" "tipo_documento_proceso" DEFAULT 'otro' NOT NULL;
--> statement-breakpoint
ALTER TABLE "procesos" ADD COLUMN IF NOT EXISTS "impuesto_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "procesos" ADD CONSTRAINT "procesos_impuesto_id_impuestos_id_fk" FOREIGN KEY ("impuesto_id") REFERENCES "public"."impuestos"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
