DO $$ BEGIN CREATE TYPE "public"."naturaleza_impuesto" AS ENUM('tributario', 'no_tributario'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
ALTER TABLE "impuestos" ADD COLUMN IF NOT EXISTS "naturaleza" "naturaleza_impuesto" DEFAULT 'tributario' NOT NULL;
