CREATE TABLE IF NOT EXISTS "compromisos_acta" (
	"id" serial PRIMARY KEY NOT NULL,
	"acta_id" integer NOT NULL,
	"descripcion" text NOT NULL,
	"fecha_limite" date,
	"acta_integrante_id" integer
);
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'compromisos_acta_acta_id_actas_reunion_id_fk') THEN ALTER TABLE "compromisos_acta" ADD CONSTRAINT "compromisos_acta_acta_id_actas_reunion_id_fk" FOREIGN KEY ("acta_id") REFERENCES "public"."actas_reunion"("id") ON DELETE cascade ON UPDATE cascade; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'compromisos_acta_acta_integrante_id_actas_integrantes_id_fk') THEN ALTER TABLE "compromisos_acta" ADD CONSTRAINT "compromisos_acta_acta_integrante_id_actas_integrantes_id_fk" FOREIGN KEY ("acta_integrante_id") REFERENCES "public"."actas_integrantes"("id") ON DELETE set null ON UPDATE cascade; END IF; END $$;
