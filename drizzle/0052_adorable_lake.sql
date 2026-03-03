CREATE TABLE "importaciones_comparendos" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"total_archivos" integer DEFAULT 0 NOT NULL,
	"importados" integer DEFAULT 0 NOT NULL,
	"omitidos" integer DEFAULT 0 NOT NULL,
	"fallidos" integer DEFAULT 0 NOT NULL,
	"estado" text DEFAULT 'procesando' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "importaciones_comparendos" ADD CONSTRAINT "importaciones_comparendos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;