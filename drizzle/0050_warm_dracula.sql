ALTER TABLE "orden_comparendo" RENAME COLUMN "visible" TO "legible";--> statement-breakpoint
ALTER TABLE "orden_comparendo" DROP CONSTRAINT "orden_comparendo_proceso_id_unique";