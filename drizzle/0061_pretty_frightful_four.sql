ALTER TYPE "public"."rol_usuario" ADD VALUE 'usuario_cliente';--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "cliente_id" integer;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;