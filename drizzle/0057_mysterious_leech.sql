CREATE TABLE "vehiculos" (
	"id" serial PRIMARY KEY NOT NULL,
	"contribuyente_id" integer NOT NULL,
	"placa" text NOT NULL,
	"modelo" integer,
	"clase" text,
	"marca" text,
	"linea" text,
	"cilindraje" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehiculos_placa_unique" UNIQUE("placa")
);
--> statement-breakpoint
ALTER TABLE "impuestos" ADD COLUMN "vehiculo_id" integer;--> statement-breakpoint
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_contribuyente_id_contribuyentes_id_fk" FOREIGN KEY ("contribuyente_id") REFERENCES "public"."contribuyentes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "impuestos" ADD CONSTRAINT "impuestos_vehiculo_id_vehiculos_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculos"("id") ON DELETE set null ON UPDATE cascade;