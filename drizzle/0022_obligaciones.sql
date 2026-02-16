CREATE TABLE IF NOT EXISTS "obligaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"descripcion" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actividades" ADD COLUMN IF NOT EXISTS "obligacion_id" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "actividades" ADD CONSTRAINT "actividades_obligacion_id_obligaciones_id_fk" FOREIGN KEY ("obligacion_id") REFERENCES "public"."obligaciones"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
