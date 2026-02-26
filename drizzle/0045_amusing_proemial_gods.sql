CREATE TABLE "importaciones_procesos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre_archivo" text NOT NULL,
	"usuario_id" integer,
	"total_registros" integer DEFAULT 0 NOT NULL,
	"exitosos" integer DEFAULT 0 NOT NULL,
	"fallidos" integer DEFAULT 0 NOT NULL,
	"omitidos" integer DEFAULT 0 NOT NULL,
	"estado" text DEFAULT 'procesando' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "procesos" ADD COLUMN "importacion_id" integer;--> statement-breakpoint
ALTER TABLE "importaciones_procesos" ADD CONSTRAINT "importaciones_procesos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "procesos" ADD CONSTRAINT "procesos_importacion_id_importaciones_procesos_id_fk" FOREIGN KEY ("importacion_id") REFERENCES "public"."importaciones_procesos"("id") ON DELETE set null ON UPDATE cascade;