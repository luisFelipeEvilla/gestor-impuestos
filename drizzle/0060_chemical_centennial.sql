CREATE TABLE "mandamientos_pago" (
	"id" serial PRIMARY KEY NOT NULL,
	"proceso_id" integer NOT NULL,
	"generado_por_id" integer,
	"ruta_archivo" text NOT NULL,
	"nombre_original" text NOT NULL,
	"tamano" integer NOT NULL,
	"firmado_por_id" integer,
	"firmado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mandamientos_pago" ADD CONSTRAINT "mandamientos_pago_proceso_id_comparendos_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."comparendos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mandamientos_pago" ADD CONSTRAINT "mandamientos_pago_generado_por_id_usuarios_id_fk" FOREIGN KEY ("generado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mandamientos_pago" ADD CONSTRAINT "mandamientos_pago_firmado_por_id_usuarios_id_fk" FOREIGN KEY ("firmado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;