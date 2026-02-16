ALTER TABLE "procesos" ADD COLUMN IF NOT EXISTS "numero_resolucion" text;
--> statement-breakpoint
ALTER TABLE "procesos" ADD COLUMN IF NOT EXISTS "fecha_resolucion" date;
--> statement-breakpoint
ALTER TABLE "procesos" ADD COLUMN IF NOT EXISTS "fecha_aplicacion_impuesto" date;
