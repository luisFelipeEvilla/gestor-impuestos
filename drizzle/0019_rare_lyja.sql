CREATE TABLE IF NOT EXISTS "cargos_empresa" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "empresa" ADD COLUMN IF NOT EXISTS "cargo_firmante_actas" text;
--> statement-breakpoint
INSERT INTO "cargos_empresa" ("nombre", "orden") VALUES ('Gerente general', 0), ('Abogado', 1);
