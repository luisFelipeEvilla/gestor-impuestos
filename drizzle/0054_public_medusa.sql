ALTER TABLE "procesos" RENAME TO "comparendos";--> statement-breakpoint
ALTER TABLE "acuerdos_pago" DROP CONSTRAINT "acuerdos_pago_proceso_id_procesos_id_fk";
--> statement-breakpoint
ALTER TABLE "cobros_coactivos" DROP CONSTRAINT "cobros_coactivos_proceso_id_procesos_id_fk";
--> statement-breakpoint
ALTER TABLE "documentos_proceso" DROP CONSTRAINT "documentos_proceso_proceso_id_procesos_id_fk";
--> statement-breakpoint
ALTER TABLE "historial_proceso" DROP CONSTRAINT "historial_proceso_proceso_id_procesos_id_fk";
--> statement-breakpoint
ALTER TABLE "orden_comparendo" DROP CONSTRAINT "orden_comparendo_proceso_id_procesos_id_fk";
--> statement-breakpoint
ALTER TABLE "ordenes_resolucion" DROP CONSTRAINT "ordenes_resolucion_proceso_id_procesos_id_fk";
--> statement-breakpoint
ALTER TABLE "comparendos" DROP CONSTRAINT "procesos_contribuyente_id_contribuyentes_id_fk";
--> statement-breakpoint
ALTER TABLE "comparendos" DROP CONSTRAINT "procesos_asignado_a_id_usuarios_id_fk";
--> statement-breakpoint
ALTER TABLE "comparendos" DROP CONSTRAINT "procesos_impuesto_id_impuestos_id_fk";
--> statement-breakpoint
ALTER TABLE "comparendos" DROP CONSTRAINT "procesos_importacion_id_importaciones_procesos_id_fk";
--> statement-breakpoint
ALTER TABLE "acuerdos_pago" ADD CONSTRAINT "acuerdos_pago_proceso_id_comparendos_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."comparendos"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cobros_coactivos" ADD CONSTRAINT "cobros_coactivos_proceso_id_comparendos_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."comparendos"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "documentos_proceso" ADD CONSTRAINT "documentos_proceso_proceso_id_comparendos_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."comparendos"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "historial_proceso" ADD CONSTRAINT "historial_proceso_proceso_id_comparendos_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."comparendos"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "orden_comparendo" ADD CONSTRAINT "orden_comparendo_proceso_id_comparendos_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."comparendos"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ordenes_resolucion" ADD CONSTRAINT "ordenes_resolucion_proceso_id_comparendos_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."comparendos"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "comparendos" ADD CONSTRAINT "comparendos_contribuyente_id_contribuyentes_id_fk" FOREIGN KEY ("contribuyente_id") REFERENCES "public"."contribuyentes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "comparendos" ADD CONSTRAINT "comparendos_asignado_a_id_usuarios_id_fk" FOREIGN KEY ("asignado_a_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "comparendos" ADD CONSTRAINT "comparendos_impuesto_id_impuestos_id_fk" FOREIGN KEY ("impuesto_id") REFERENCES "public"."impuestos"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "comparendos" ADD CONSTRAINT "comparendos_importacion_id_importaciones_procesos_id_fk" FOREIGN KEY ("importacion_id") REFERENCES "public"."importaciones_procesos"("id") ON DELETE set null ON UPDATE cascade;