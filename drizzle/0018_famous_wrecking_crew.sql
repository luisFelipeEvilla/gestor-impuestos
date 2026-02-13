CREATE TABLE "empresa" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"tipo_documento" "tipo_documento" DEFAULT 'nit' NOT NULL,
	"numero_documento" text NOT NULL,
	"direccion" text,
	"telefono_contacto" text,
	"numero_contacto" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
