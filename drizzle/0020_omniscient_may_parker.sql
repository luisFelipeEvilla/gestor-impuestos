CREATE TABLE IF NOT EXISTS "compromisos_acta_historial" (
	"id" serial PRIMARY KEY NOT NULL,
	"compromiso_acta_id" integer NOT NULL,
	"estado_anterior" "estado_compromiso_acta",
	"estado_nuevo" "estado_compromiso_acta" NOT NULL,
	"detalle" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"creado_por_id" integer
);
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'compromisos_acta_historial_compromiso_acta_id_compromisos_acta_id_fk') THEN ALTER TABLE "compromisos_acta_historial" ADD CONSTRAINT "compromisos_acta_historial_compromiso_acta_id_compromisos_acta_id_fk" FOREIGN KEY ("compromiso_acta_id") REFERENCES "public"."compromisos_acta"("id") ON DELETE cascade ON UPDATE cascade; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'compromisos_acta_historial_creado_por_id_usuarios_id_fk') THEN ALTER TABLE "compromisos_acta_historial" ADD CONSTRAINT "compromisos_acta_historial_creado_por_id_usuarios_id_fk" FOREIGN KEY ("creado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade; END IF; END $$;
