CREATE TABLE IF NOT EXISTS "actas_reunion_actividades" (
	"acta_id" integer NOT NULL,
	"actividad_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "actividades" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"descripcion" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "actividades_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'actas_reunion_actividades_acta_id_actas_reunion_id_fk') THEN ALTER TABLE "actas_reunion_actividades" ADD CONSTRAINT "actas_reunion_actividades_acta_id_actas_reunion_id_fk" FOREIGN KEY ("acta_id") REFERENCES "public"."actas_reunion"("id") ON DELETE cascade ON UPDATE cascade; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'actas_reunion_actividades_actividad_id_actividades_id_fk') THEN ALTER TABLE "actas_reunion_actividades" ADD CONSTRAINT "actas_reunion_actividades_actividad_id_actividades_id_fk" FOREIGN KEY ("actividad_id") REFERENCES "public"."actividades"("id") ON DELETE cascade ON UPDATE cascade; END IF; END $$;
