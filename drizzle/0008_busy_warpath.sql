CREATE TYPE "public"."tipo_integrante_acta" AS ENUM('interno', 'externo');--> statement-breakpoint
ALTER TABLE "actas_integrantes" ADD COLUMN "tipo" "tipo_integrante_acta" DEFAULT 'externo' NOT NULL;