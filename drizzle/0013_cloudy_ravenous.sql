CREATE TABLE "compromisos_acta" (
	"id" serial PRIMARY KEY NOT NULL,
	"acta_id" integer NOT NULL,
	"descripcion" text NOT NULL,
	"fecha_limite" date,
	"acta_integrante_id" integer
);
--> statement-breakpoint
ALTER TABLE "compromisos_acta" ADD CONSTRAINT "compromisos_acta_acta_id_actas_reunion_id_fk" FOREIGN KEY ("acta_id") REFERENCES "public"."actas_reunion"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "compromisos_acta" ADD CONSTRAINT "compromisos_acta_acta_integrante_id_actas_integrantes_id_fk" FOREIGN KEY ("acta_integrante_id") REFERENCES "public"."actas_integrantes"("id") ON DELETE set null ON UPDATE cascade;