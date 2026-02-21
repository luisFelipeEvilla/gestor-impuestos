-- Los procesos ya no están obligados a estar amarrados a un impuesto.
ALTER TABLE "procesos" ALTER COLUMN "impuesto_id" DROP NOT NULL;
