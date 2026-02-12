CREATE TYPE "public"."estado_acta" AS ENUM('borrador', 'pendiente_aprobacion', 'aprobada', 'enviada');--> statement-breakpoint
CREATE TYPE "public"."tipo_evento_acta" AS ENUM('creacion', 'edicion', 'envio_aprobacion', 'aprobacion', 'envio_correo');--> statement-breakpoint
CREATE TABLE "actas_integrantes" (
	"id" serial PRIMARY KEY NOT NULL,
	"acta_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"usuario_id" integer
);
--> statement-breakpoint
CREATE TABLE "actas_reunion" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"objetivo" text NOT NULL,
	"contenido" text,
	"estado" "estado_acta" DEFAULT 'borrador' NOT NULL,
	"creado_por_id" integer NOT NULL,
	"aprobado_por_id" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentos_acta" (
	"id" serial PRIMARY KEY NOT NULL,
	"acta_id" integer NOT NULL,
	"nombre_original" text NOT NULL,
	"ruta_archivo" text NOT NULL,
	"mime_type" text NOT NULL,
	"tamano" integer NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historial_acta" (
	"id" serial PRIMARY KEY NOT NULL,
	"acta_id" integer NOT NULL,
	"usuario_id" integer,
	"tipo_evento" "tipo_evento_acta" NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "actas_integrantes" ADD CONSTRAINT "actas_integrantes_acta_id_actas_reunion_id_fk" FOREIGN KEY ("acta_id") REFERENCES "public"."actas_reunion"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "actas_integrantes" ADD CONSTRAINT "actas_integrantes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "actas_reunion" ADD CONSTRAINT "actas_reunion_creado_por_id_usuarios_id_fk" FOREIGN KEY ("creado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "actas_reunion" ADD CONSTRAINT "actas_reunion_aprobado_por_id_usuarios_id_fk" FOREIGN KEY ("aprobado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "documentos_acta" ADD CONSTRAINT "documentos_acta_acta_id_actas_reunion_id_fk" FOREIGN KEY ("acta_id") REFERENCES "public"."actas_reunion"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "historial_acta" ADD CONSTRAINT "historial_acta_acta_id_actas_reunion_id_fk" FOREIGN KEY ("acta_id") REFERENCES "public"."actas_reunion"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "historial_acta" ADD CONSTRAINT "historial_acta_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;