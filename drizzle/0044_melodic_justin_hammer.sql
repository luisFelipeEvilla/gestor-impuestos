ALTER TABLE "procesos" ADD COLUMN "importado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "procesos" ADD COLUMN "fecha_importacion" timestamp with time zone;