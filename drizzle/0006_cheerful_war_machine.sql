CREATE TABLE IF NOT EXISTS "actas_reunion_clientes" (
	"acta_id" integer NOT NULL,
	"cliente_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clientes" (
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
ALTER TABLE "impuestos" ADD COLUMN IF NOT EXISTS "cliente_id" integer;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'actas_reunion_clientes_acta_id_actas_reunion_id_fk') THEN ALTER TABLE "actas_reunion_clientes" ADD CONSTRAINT "actas_reunion_clientes_acta_id_actas_reunion_id_fk" FOREIGN KEY ("acta_id") REFERENCES "public"."actas_reunion"("id") ON DELETE cascade ON UPDATE cascade; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'actas_reunion_clientes_cliente_id_clientes_id_fk') THEN ALTER TABLE "actas_reunion_clientes" ADD CONSTRAINT "actas_reunion_clientes_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE cascade; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'impuestos_cliente_id_clientes_id_fk') THEN ALTER TABLE "impuestos" ADD CONSTRAINT "impuestos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE cascade; END IF; END $$;
