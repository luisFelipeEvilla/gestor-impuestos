CREATE TABLE IF NOT EXISTS "acuerdos_pago" (
	"id" serial PRIMARY KEY NOT NULL,
	"proceso_id" integer NOT NULL,
	"numero_acuerdo" text NOT NULL,
	"fecha_acuerdo" date,
	"fecha_inicio" date,
	"cuotas" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cobros_coactivos" (
	"id" serial PRIMARY KEY NOT NULL,
	"proceso_id" integer NOT NULL,
	"fecha_inicio" date NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cobros_coactivos_proceso_id_unique" UNIQUE("proceso_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ordenes_resolucion" (
	"id" serial PRIMARY KEY NOT NULL,
	"proceso_id" integer NOT NULL,
	"numero_resolucion" text NOT NULL,
	"fecha_resolucion" date,
	"ruta_archivo" text,
	"nombre_original" text,
	"mime_type" text,
	"tamano" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ordenes_resolucion_proceso_id_unique" UNIQUE("proceso_id")
);
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'acuerdos_pago_proceso_id_procesos_id_fk') THEN ALTER TABLE "acuerdos_pago" ADD CONSTRAINT "acuerdos_pago_proceso_id_procesos_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."procesos"("id") ON DELETE cascade ON UPDATE cascade; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'cobros_coactivos_proceso_id_procesos_id_fk') THEN ALTER TABLE "cobros_coactivos" ADD CONSTRAINT "cobros_coactivos_proceso_id_procesos_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."procesos"("id") ON DELETE cascade ON UPDATE cascade; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'ordenes_resolucion_proceso_id_procesos_id_fk') THEN ALTER TABLE "ordenes_resolucion" ADD CONSTRAINT "ordenes_resolucion_proceso_id_procesos_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."procesos"("id") ON DELETE cascade ON UPDATE cascade; END IF; END $$;
