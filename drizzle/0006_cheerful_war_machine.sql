CREATE TABLE "actas_reunion_clientes" (
	"acta_id" integer NOT NULL,
	"cliente_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"codigo" text,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clientes_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
ALTER TABLE "impuestos" ADD COLUMN "cliente_id" integer;--> statement-breakpoint
ALTER TABLE "actas_reunion_clientes" ADD CONSTRAINT "actas_reunion_clientes_acta_id_actas_reunion_id_fk" FOREIGN KEY ("acta_id") REFERENCES "public"."actas_reunion"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "actas_reunion_clientes" ADD CONSTRAINT "actas_reunion_clientes_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "impuestos" ADD CONSTRAINT "impuestos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE cascade;