CREATE TABLE "clientes_miembros" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"cargo" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actas_integrantes" ADD COLUMN "solicitar_aprobacion_correo" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "compromisos_acta" ADD COLUMN "cliente_miembro_id" integer;--> statement-breakpoint
ALTER TABLE "clientes_miembros" ADD CONSTRAINT "clientes_miembros_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "compromisos_acta" ADD CONSTRAINT "compromisos_acta_cliente_miembro_id_clientes_miembros_id_fk" FOREIGN KEY ("cliente_miembro_id") REFERENCES "public"."clientes_miembros"("id") ON DELETE set null ON UPDATE cascade;