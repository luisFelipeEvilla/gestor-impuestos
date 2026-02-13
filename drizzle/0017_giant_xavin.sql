CREATE TYPE "public"."estado_compromiso_acta" AS ENUM('pendiente', 'cumplido', 'no_cumplido');--> statement-breakpoint
ALTER TABLE "compromisos_acta" ADD COLUMN "estado" "estado_compromiso_acta" DEFAULT 'pendiente' NOT NULL;--> statement-breakpoint
ALTER TABLE "compromisos_acta" ADD COLUMN "detalle_actualizacion" text;--> statement-breakpoint
ALTER TABLE "compromisos_acta" ADD COLUMN "actualizado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "compromisos_acta" ADD COLUMN "actualizado_por_id" integer;--> statement-breakpoint
ALTER TABLE "compromisos_acta" ADD CONSTRAINT "compromisos_acta_actualizado_por_id_usuarios_id_fk" FOREIGN KEY ("actualizado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;