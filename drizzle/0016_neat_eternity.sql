ALTER TYPE "public"."tipo_evento_acta" ADD VALUE 'rechazo_participante' BEFORE 'envio_correo';--> statement-breakpoint
ALTER TABLE "aprobaciones_acta_participante" ADD COLUMN "rechazado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "aprobaciones_acta_participante" ADD COLUMN "motivo_rechazo" text;