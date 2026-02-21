ALTER TABLE "procesos" ADD COLUMN IF NOT EXISTS "no_comparendo" text;
--> statement-breakpoint
ALTER TABLE "impuestos" DROP COLUMN "tipo";
--> statement-breakpoint
DROP TYPE "public"."tipo_impuesto";
