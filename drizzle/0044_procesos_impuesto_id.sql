ALTER TABLE "procesos" ADD COLUMN IF NOT EXISTS "impuesto_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "procesos" ADD CONSTRAINT "procesos_impuesto_id_impuestos_id_fk" FOREIGN KEY ("impuesto_id") REFERENCES "public"."impuestos"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
