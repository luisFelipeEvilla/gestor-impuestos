DO $$ BEGIN CREATE TYPE "public"."estado_compromiso_acta" AS ENUM('pendiente', 'cumplido', 'no_cumplido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
ALTER TABLE "compromisos_acta" ADD COLUMN IF NOT EXISTS "estado" "estado_compromiso_acta" DEFAULT 'pendiente' NOT NULL;
--> statement-breakpoint
ALTER TABLE "compromisos_acta" ADD COLUMN IF NOT EXISTS "detalle_actualizacion" text;
--> statement-breakpoint
ALTER TABLE "compromisos_acta" ADD COLUMN IF NOT EXISTS "actualizado_en" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "compromisos_acta" ADD COLUMN IF NOT EXISTS "actualizado_por_id" integer;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'compromisos_acta_actualizado_por_id_usuarios_id_fk') THEN ALTER TABLE "compromisos_acta" ADD CONSTRAINT "compromisos_acta_actualizado_por_id_usuarios_id_fk" FOREIGN KEY ("actualizado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade; END IF; END $$;
