CREATE TABLE IF NOT EXISTS "public"."documentos_compromiso_acta" (
	"id" serial PRIMARY KEY NOT NULL,
	"compromiso_acta_historial_id" integer NOT NULL,
	"nombre_original" text NOT NULL,
	"ruta_archivo" text NOT NULL,
	"mime_type" text NOT NULL,
	"tamano" integer NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "impuestos" DROP CONSTRAINT IF EXISTS "impuestos_codigo_unique"; EXCEPTION WHEN undefined_table THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "actas_integrantes" ALTER COLUMN "acta_id" SET DATA TYPE uuid; EXCEPTION WHEN undefined_table THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "actas_reunion" ALTER COLUMN "id" SET DATA TYPE uuid; EXCEPTION WHEN undefined_table THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "actas_reunion" ALTER COLUMN "id" SET DEFAULT gen_random_uuid(); EXCEPTION WHEN undefined_table THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "actas_reunion_actividades" ALTER COLUMN "acta_id" SET DATA TYPE uuid; EXCEPTION WHEN undefined_table THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "actas_reunion_clientes" ALTER COLUMN "acta_id" SET DATA TYPE uuid; EXCEPTION WHEN undefined_table THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "aprobaciones_acta_participante" ALTER COLUMN "acta_id" SET DATA TYPE uuid; EXCEPTION WHEN undefined_table THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "compromisos_acta" ALTER COLUMN "acta_id" SET DATA TYPE uuid; EXCEPTION WHEN undefined_table THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "documentos_acta" ALTER COLUMN "acta_id" SET DATA TYPE uuid; EXCEPTION WHEN undefined_table THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "historial_acta" ALTER COLUMN "acta_id" SET DATA TYPE uuid; EXCEPTION WHEN undefined_table THEN NULL; END $$;
--> statement-breakpoint
ALTER TABLE "actas_reunion" ADD COLUMN IF NOT EXISTS "serial" integer DEFAULT nextval('actas_reunion_serial_seq'::regclass) NOT NULL;
--> statement-breakpoint
ALTER TABLE "impuestos" ADD COLUMN IF NOT EXISTS "prescripcion_meses" integer;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'documentos_compromiso_acta_compromiso_acta_historial_id_compromisos_acta_historial_id_fk') THEN ALTER TABLE "documentos_compromiso_acta" ADD CONSTRAINT "documentos_compromiso_acta_compromiso_acta_historial_id_compromisos_acta_historial_id_fk" FOREIGN KEY ("compromiso_acta_historial_id") REFERENCES "public"."compromisos_acta_historial"("id") ON DELETE cascade ON UPDATE cascade; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "impuestos" DROP COLUMN "codigo"; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'actas_reunion_serial_unique') THEN ALTER TABLE "actas_reunion" ADD CONSTRAINT "actas_reunion_serial_unique" UNIQUE("serial"); END IF; END $$;
