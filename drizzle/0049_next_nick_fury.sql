CREATE TABLE "orden_comparendo" (
	"id" serial PRIMARY KEY NOT NULL,
	"proceso_id" integer NOT NULL,
	"ruta_archivo" text NOT NULL,
	"nombre_original" text NOT NULL,
	"mime_type" text NOT NULL,
	"tamano" integer NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orden_comparendo_proceso_id_unique" UNIQUE("proceso_id")
);
--> statement-breakpoint
ALTER TABLE "orden_comparendo" ADD CONSTRAINT "orden_comparendo_proceso_id_procesos_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."procesos"("id") ON DELETE cascade ON UPDATE cascade;