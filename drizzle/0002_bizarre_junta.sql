CREATE TYPE "public"."categoria_documento_nota" AS ENUM('general', 'en_contacto', 'acuerdo_pago', 'cobro_coactivo');--> statement-breakpoint
ALTER TABLE "documentos_proceso" ADD COLUMN "categoria" "categoria_documento_nota" DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "historial_proceso" ADD COLUMN "categoria_nota" "categoria_documento_nota";