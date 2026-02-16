DO $$ BEGIN CREATE TYPE "public"."tipo_integrante_acta" AS ENUM('interno', 'externo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
ALTER TABLE "actas_integrantes" ADD COLUMN IF NOT EXISTS "tipo" "tipo_integrante_acta" DEFAULT 'externo' NOT NULL;
