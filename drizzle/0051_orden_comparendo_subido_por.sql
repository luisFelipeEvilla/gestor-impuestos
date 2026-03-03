ALTER TABLE "orden_comparendo" ADD COLUMN "subido_por_id" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orden_comparendo" ADD CONSTRAINT "orden_comparendo_subido_por_id_usuarios_id_fk" FOREIGN KEY ("subido_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
