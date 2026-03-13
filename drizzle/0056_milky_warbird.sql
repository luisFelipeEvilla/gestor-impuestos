-- Recrear impuestos con UUID id (sin datos que migrar)
ALTER TABLE "historial_impuesto" DROP CONSTRAINT IF EXISTS "historial_impuesto_impuesto_id_impuestos_id_fk";--> statement-breakpoint
DROP TABLE IF EXISTS "historial_impuesto";--> statement-breakpoint
DROP TABLE IF EXISTS "impuestos";--> statement-breakpoint
CREATE TABLE "impuestos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contribuyente_id" integer NOT NULL,
	"tipo_impuesto" text NOT NULL,
	"vigencia" integer NOT NULL,
	"tipo_periodo" "tipo_periodo_impuesto" NOT NULL,
	"periodo" text,
	"base_gravable" numeric(15, 2),
	"tarifa" numeric(7, 4),
	"impuesto_determinado" numeric(15, 2),
	"intereses" numeric(15, 2) DEFAULT '0',
	"sanciones" numeric(15, 2) DEFAULT '0',
	"descuentos" numeric(15, 2) DEFAULT '0',
	"total_a_pagar" numeric(15, 2),
	"estado_actual" "estado_impuesto" DEFAULT 'pendiente' NOT NULL,
	"asignado_a_id" integer,
	"fecha_vencimiento" date,
	"fecha_declaracion" date,
	"no_expediente" text,
	"observaciones" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historial_impuesto" (
	"id" serial PRIMARY KEY NOT NULL,
	"impuesto_id" uuid NOT NULL,
	"usuario_id" integer,
	"tipo_evento" "tipo_evento_impuesto" NOT NULL,
	"estado_anterior" text,
	"estado_nuevo" text,
	"comentario" text,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "impuestos" ADD CONSTRAINT "impuestos_contribuyente_id_contribuyentes_id_fk" FOREIGN KEY ("contribuyente_id") REFERENCES "public"."contribuyentes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "impuestos" ADD CONSTRAINT "impuestos_asignado_a_id_usuarios_id_fk" FOREIGN KEY ("asignado_a_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "historial_impuesto" ADD CONSTRAINT "historial_impuesto_impuesto_id_impuestos_id_fk" FOREIGN KEY ("impuesto_id") REFERENCES "public"."impuestos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_impuesto" ADD CONSTRAINT "historial_impuesto_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribuyentes" ADD CONSTRAINT "contribuyentes_tipo_doc_nit_unique" UNIQUE("tipo_documento","nit");
