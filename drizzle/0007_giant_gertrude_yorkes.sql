ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "password_reset_token_hash" text;
--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "password_reset_expires_at" timestamp with time zone;
