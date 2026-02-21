ALTER TABLE "documentos_proceso" ADD COLUMN IF NOT EXISTS "subido_por_id" integer;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'documentos_proceso_subido_por_id_usuarios_id_fk') THEN ALTER TABLE "documentos_proceso" ADD CONSTRAINT "documentos_proceso_subido_por_id_usuarios_id_fk" FOREIGN KEY ("subido_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade; END IF; END $$;
