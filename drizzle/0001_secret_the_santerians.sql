CREATE TABLE "documentos_proceso" (
	"id" serial PRIMARY KEY NOT NULL,
	"proceso_id" integer NOT NULL,
	"nombre_original" text NOT NULL,
	"ruta_archivo" text NOT NULL,
	"mime_type" text NOT NULL,
	"tamano" integer NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documentos_proceso" ADD CONSTRAINT "documentos_proceso_proceso_id_procesos_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."procesos"("id") ON DELETE cascade ON UPDATE cascade;