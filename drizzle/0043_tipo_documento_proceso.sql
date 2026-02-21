-- Tipos de documento del proceso (Mandamiento de pago, Medidas cautelares, etc.)
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "tipo_documento_proceso" AS ENUM (
    'orden_resolucion',
    'mandamiento_pago',
    'acta_notificacion',
    'acuerdo_pago_firmado',
    'liquidacion',
    'medidas_cautelares',
    'resolucion_incumplimiento',
    'auto_terminacion',
    'constancia_pago',
    'otro'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "documentos_proceso" ADD COLUMN IF NOT EXISTS "tipo_documento" "tipo_documento_proceso" DEFAULT 'otro' NOT NULL;
