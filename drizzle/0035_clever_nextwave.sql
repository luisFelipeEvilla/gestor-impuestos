DO $$ BEGIN
  CREATE TYPE "public"."tipo_resolucion" AS ENUM('sancion', 'resumen_ap');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "ordenes_resolucion" ADD COLUMN IF NOT EXISTS "codigo_infraccion" text;
--> statement-breakpoint
ALTER TABLE "ordenes_resolucion" ADD COLUMN IF NOT EXISTS "tipo_resolucion" "tipo_resolucion";
