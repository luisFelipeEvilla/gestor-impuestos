CREATE TABLE "obligaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"descripcion" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actividades" ADD COLUMN "obligacion_id" integer;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "cargo_id" integer;--> statement-breakpoint
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_obligacion_id_obligaciones_id_fk" FOREIGN KEY ("obligacion_id") REFERENCES "public"."obligaciones"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_cargo_id_cargos_empresa_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos_empresa"("id") ON DELETE set null ON UPDATE cascade;