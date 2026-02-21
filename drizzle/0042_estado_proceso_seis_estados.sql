-- Nuevo modelo de estados: 6 estados (Pendiente, Asignado, Facturación, Acuerdo de pago, Cobro coactivo, Finalizado).
-- Añadir nuevos valores al enum existente y migrar datos (mantener en_cobro_coactivo, resto → pendiente).
--> statement-breakpoint
ALTER TYPE "estado_proceso" ADD VALUE IF NOT EXISTS 'facturacion';
--> statement-breakpoint
ALTER TYPE "estado_proceso" ADD VALUE IF NOT EXISTS 'acuerdo_pago';
--> statement-breakpoint
ALTER TYPE "estado_proceso" ADD VALUE IF NOT EXISTS 'finalizado';
--> statement-breakpoint
UPDATE "procesos" SET "estado_actual" = 'pendiente' WHERE "estado_actual" IS DISTINCT FROM 'en_cobro_coactivo';
