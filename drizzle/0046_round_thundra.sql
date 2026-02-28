CREATE TYPE "public"."estado_cuota_acuerdo" AS ENUM('pendiente', 'pagada');--> statement-breakpoint
CREATE TABLE "cuotas_acuerdo" (
	"id" serial PRIMARY KEY NOT NULL,
	"acuerdo_pago_id" integer NOT NULL,
	"numero_cuota" integer NOT NULL,
	"fecha_vencimiento" date,
	"monto_esperado" numeric(15, 2),
	"estado" "estado_cuota_acuerdo" DEFAULT 'pendiente' NOT NULL,
	"fecha_pago" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "importaciones_acuerdos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre_archivo" text NOT NULL,
	"usuario_id" integer,
	"total_registros" integer DEFAULT 0 NOT NULL,
	"importados" integer DEFAULT 0 NOT NULL,
	"omitidos" integer DEFAULT 0 NOT NULL,
	"fallidos" integer DEFAULT 0 NOT NULL,
	"estado" text DEFAULT 'procesando' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cuotas_acuerdo" ADD CONSTRAINT "cuotas_acuerdo_acuerdo_pago_id_acuerdos_pago_id_fk" FOREIGN KEY ("acuerdo_pago_id") REFERENCES "public"."acuerdos_pago"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "importaciones_acuerdos" ADD CONSTRAINT "importaciones_acuerdos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;