-- Migrar impuestos.id de serial a uuid preservando datos y FK desde procesos

-- 1. Añadir columna uuid en impuestos y rellenar
ALTER TABLE "impuestos" ADD COLUMN IF NOT EXISTS "id_new" uuid DEFAULT gen_random_uuid();
UPDATE "impuestos" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;

-- 2. Añadir columna uuid en procesos y rellenar desde impuestos
ALTER TABLE "procesos" ADD COLUMN IF NOT EXISTS "impuesto_id_new" uuid;
UPDATE "procesos" SET "impuesto_id_new" = (
  SELECT i."id_new" FROM "impuestos" i WHERE i."id" = "procesos"."impuesto_id"
);

-- 3. Quitar FK procesos -> impuestos
ALTER TABLE "procesos" DROP CONSTRAINT IF EXISTS "procesos_impuesto_id_impuestos_id_fk";

-- 4. En procesos: quitar columna antigua y renombrar la nueva
ALTER TABLE "procesos" DROP COLUMN "impuesto_id";
ALTER TABLE "procesos" RENAME COLUMN "impuesto_id_new" TO "impuesto_id";

-- 5. En impuestos: quitar PK y columna id, renombrar id_new a id, restaurar PK
ALTER TABLE "impuestos" DROP CONSTRAINT IF EXISTS "impuestos_pkey";
ALTER TABLE "impuestos" DROP COLUMN "id";
ALTER TABLE "impuestos" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "impuestos" ADD PRIMARY KEY ("id");

-- 6. Restaurar FK procesos -> impuestos
ALTER TABLE "procesos" ALTER COLUMN "impuesto_id" SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'procesos_impuesto_id_impuestos_id_fk') THEN
    ALTER TABLE "procesos" ADD CONSTRAINT "procesos_impuesto_id_impuestos_id_fk"
      FOREIGN KEY ("impuesto_id") REFERENCES "public"."impuestos"("id") ON DELETE restrict ON UPDATE cascade;
  END IF;
END $$;
