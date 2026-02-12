CREATE TABLE "aprobaciones_acta_participante" (
	"id" serial PRIMARY KEY NOT NULL,
	"acta_id" integer NOT NULL,
	"acta_integrante_id" integer NOT NULL,
	"aprobado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aprobaciones_acta_integrante_uniq" UNIQUE("acta_id","acta_integrante_id")
);
--> statement-breakpoint
ALTER TABLE "aprobaciones_acta_participante" ADD CONSTRAINT "aprobaciones_acta_participante_acta_id_actas_reunion_id_fk" FOREIGN KEY ("acta_id") REFERENCES "public"."actas_reunion"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "aprobaciones_acta_participante" ADD CONSTRAINT "aprobaciones_acta_participante_acta_integrante_id_actas_integrantes_id_fk" FOREIGN KEY ("acta_integrante_id") REFERENCES "public"."actas_integrantes"("id") ON DELETE cascade ON UPDATE cascade;