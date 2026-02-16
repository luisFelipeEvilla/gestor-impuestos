DO $$ BEGIN CREATE TYPE "public"."estado_proceso" AS ENUM('pendiente', 'asignado', 'en_contacto', 'notificado', 'en_negociacion', 'cobrado', 'incobrable', 'en_cobro_coactivo', 'suspendido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."rol_usuario" AS ENUM('admin', 'empleado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."tipo_documento" AS ENUM('nit', 'cedula'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."tipo_evento_historial" AS ENUM('cambio_estado', 'asignacion', 'nota', 'notificacion', 'pago'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."tipo_impuesto" AS ENUM('nacional', 'municipal'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contribuyentes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nit" text NOT NULL,
	"tipo_documento" "tipo_documento" DEFAULT 'nit' NOT NULL,
	"nombre_razon_social" text NOT NULL,
	"telefono" text,
	"email" text,
	"direccion" text,
	"ciudad" text,
	"departamento" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "historial_proceso" (
	"id" serial PRIMARY KEY NOT NULL,
	"proceso_id" integer NOT NULL,
	"usuario_id" integer,
	"tipo_evento" "tipo_evento_historial" NOT NULL,
	"estado_anterior" "estado_proceso",
	"estado_nuevo" "estado_proceso",
	"comentario" text,
	"metadata" jsonb,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "impuestos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"codigo" text NOT NULL,
	"tipo" "tipo_impuesto" NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "impuestos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "procesos" (
	"id" serial PRIMARY KEY NOT NULL,
	"impuesto_id" integer NOT NULL,
	"contribuyente_id" integer NOT NULL,
	"vigencia" integer NOT NULL,
	"periodo" text,
	"monto_cop" numeric(15, 2) NOT NULL,
	"estado_actual" "estado_proceso" DEFAULT 'pendiente' NOT NULL,
	"asignado_a_id" integer,
	"fecha_limite" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"nombre" text NOT NULL,
	"password_hash" text,
	"rol" "rol_usuario" DEFAULT 'empleado' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'historial_proceso_proceso_id_procesos_id_fk') THEN ALTER TABLE "historial_proceso" ADD CONSTRAINT "historial_proceso_proceso_id_procesos_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."procesos"("id") ON DELETE cascade ON UPDATE cascade; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'historial_proceso_usuario_id_usuarios_id_fk') THEN ALTER TABLE "historial_proceso" ADD CONSTRAINT "historial_proceso_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'procesos_impuesto_id_impuestos_id_fk') THEN ALTER TABLE "procesos" ADD CONSTRAINT "procesos_impuesto_id_impuestos_id_fk" FOREIGN KEY ("impuesto_id") REFERENCES "public"."impuestos"("id") ON DELETE restrict ON UPDATE cascade; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'procesos_contribuyente_id_contribuyentes_id_fk') THEN ALTER TABLE "procesos" ADD CONSTRAINT "procesos_contribuyente_id_contribuyentes_id_fk" FOREIGN KEY ("contribuyente_id") REFERENCES "public"."contribuyentes"("id") ON DELETE restrict ON UPDATE cascade; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'procesos_asignado_a_id_usuarios_id_fk') THEN ALTER TABLE "procesos" ADD CONSTRAINT "procesos_asignado_a_id_usuarios_id_fk" FOREIGN KEY ("asignado_a_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade; END IF; END $$;
