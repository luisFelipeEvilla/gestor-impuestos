CREATE TYPE "public"."tipo_documento_proceso" AS ENUM('orden_resolucion', 'mandamiento_pago', 'acta_notificacion', 'acuerdo_pago_firmado', 'liquidacion', 'medidas_cautelares', 'resolucion_incumplimiento', 'auto_terminacion', 'constancia_pago', 'otro');--> statement-breakpoint
ALTER TABLE "cobros_coactivos" DROP CONSTRAINT "cobros_coactivos_proceso_id_unique";--> statement-breakpoint
ALTER TABLE "historial_proceso" ALTER COLUMN "estado_anterior" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "historial_proceso" ALTER COLUMN "estado_nuevo" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "procesos" ALTER COLUMN "estado_actual" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "procesos" ALTER COLUMN "estado_actual" SET DEFAULT 'pendiente'::text;--> statement-breakpoint
DROP TYPE "public"."estado_proceso";--> statement-breakpoint
CREATE TYPE "public"."estado_proceso" AS ENUM('pendiente', 'asignado', 'facturacion', 'acuerdo_pago', 'en_cobro_coactivo', 'finalizado');--> statement-breakpoint
ALTER TABLE "historial_proceso" ALTER COLUMN "estado_anterior" SET DATA TYPE "public"."estado_proceso" USING "estado_anterior"::"public"."estado_proceso";--> statement-breakpoint
ALTER TABLE "historial_proceso" ALTER COLUMN "estado_nuevo" SET DATA TYPE "public"."estado_proceso" USING "estado_nuevo"::"public"."estado_proceso";--> statement-breakpoint
ALTER TABLE "procesos" ALTER COLUMN "estado_actual" SET DEFAULT 'pendiente'::"public"."estado_proceso";--> statement-breakpoint
ALTER TABLE "procesos" ALTER COLUMN "estado_actual" SET DATA TYPE "public"."estado_proceso" USING "estado_actual"::"public"."estado_proceso";--> statement-breakpoint
ALTER TABLE "cobros_coactivos" ADD COLUMN "activo" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "documentos_proceso" ADD COLUMN "tipo_documento" "tipo_documento_proceso" DEFAULT 'otro' NOT NULL;--> statement-breakpoint
ALTER TABLE "procesos" ADD COLUMN "impuesto_id" uuid;--> statement-breakpoint
ALTER TABLE "procesos" ADD CONSTRAINT "procesos_impuesto_id_impuestos_id_fk" FOREIGN KEY ("impuesto_id") REFERENCES "public"."impuestos"("id") ON DELETE set null ON UPDATE cascade;