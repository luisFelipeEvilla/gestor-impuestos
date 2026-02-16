DO $$ BEGIN CREATE TYPE "public"."categoria_documento_nota" AS ENUM('general', 'en_contacto', 'acuerdo_pago', 'cobro_coactivo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
ALTER TABLE "documentos_proceso" ADD COLUMN IF NOT EXISTS "categoria" "categoria_documento_nota" DEFAULT 'general' NOT NULL;
--> statement-breakpoint
ALTER TABLE "historial_proceso" ADD COLUMN IF NOT EXISTS "categoria_nota" "categoria_documento_nota";
