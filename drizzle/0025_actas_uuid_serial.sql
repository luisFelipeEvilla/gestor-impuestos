-- Migración: actas_reunion.id de integer a uuid y añadir serial.
-- La secuencia se crea siempre para que exista con schema nuevo (drizzle push).
CREATE SEQUENCE IF NOT EXISTS actas_reunion_serial_seq;
--> statement-breakpoint
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'actas_reunion' AND column_name = 'id') = 'integer' THEN
    -- 1. Secuencia ya creada arriba

    -- 2. Añadir columna serial y rellenar con orden por id
    ALTER TABLE actas_reunion ADD COLUMN IF NOT EXISTS serial integer;
    UPDATE actas_reunion SET serial = sub.rn
    FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM actas_reunion) sub
    WHERE actas_reunion.id = sub.id;
    ALTER TABLE actas_reunion ALTER COLUMN serial SET NOT NULL;
    DO $u$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'actas_reunion_serial_unique') THEN ALTER TABLE actas_reunion ADD CONSTRAINT actas_reunion_serial_unique UNIQUE (serial); END IF; END $u$;
    ALTER TABLE actas_reunion ALTER COLUMN serial SET DEFAULT nextval('actas_reunion_serial_seq');
    PERFORM setval('actas_reunion_serial_seq', (SELECT COALESCE(max(serial), 1) FROM actas_reunion));

    -- 3. Añadir id_uuid en actas_reunion y rellenar
    ALTER TABLE actas_reunion ADD COLUMN IF NOT EXISTS id_uuid uuid DEFAULT gen_random_uuid();
    UPDATE actas_reunion SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;

    -- 4. En tablas hijas: añadir acta_id_uuid y copiar desde actas_reunion
    ALTER TABLE actas_integrantes ADD COLUMN IF NOT EXISTS acta_id_uuid uuid;
    UPDATE actas_integrantes c SET acta_id_uuid = ar.id_uuid FROM actas_reunion ar WHERE ar.id = c.acta_id;
    ALTER TABLE compromisos_acta ADD COLUMN IF NOT EXISTS acta_id_uuid uuid;
    UPDATE compromisos_acta c SET acta_id_uuid = ar.id_uuid FROM actas_reunion ar WHERE ar.id = c.acta_id;
    ALTER TABLE aprobaciones_acta_participante ADD COLUMN IF NOT EXISTS acta_id_uuid uuid;
    UPDATE aprobaciones_acta_participante c SET acta_id_uuid = ar.id_uuid FROM actas_reunion ar WHERE ar.id = c.acta_id;
    ALTER TABLE documentos_acta ADD COLUMN IF NOT EXISTS acta_id_uuid uuid;
    UPDATE documentos_acta c SET acta_id_uuid = ar.id_uuid FROM actas_reunion ar WHERE ar.id = c.acta_id;
    ALTER TABLE historial_acta ADD COLUMN IF NOT EXISTS acta_id_uuid uuid;
    UPDATE historial_acta c SET acta_id_uuid = ar.id_uuid FROM actas_reunion ar WHERE ar.id = c.acta_id;
    ALTER TABLE actas_reunion_actividades ADD COLUMN IF NOT EXISTS acta_id_uuid uuid;
    UPDATE actas_reunion_actividades c SET acta_id_uuid = ar.id_uuid FROM actas_reunion ar WHERE ar.id = c.acta_id;
    ALTER TABLE actas_reunion_clientes ADD COLUMN IF NOT EXISTS acta_id_uuid uuid;
    UPDATE actas_reunion_clientes c SET acta_id_uuid = ar.id_uuid FROM actas_reunion ar WHERE ar.id = c.acta_id;

    -- 5. Quitar FKs que referencian actas_reunion(id)
    ALTER TABLE actas_integrantes DROP CONSTRAINT IF EXISTS actas_integrantes_acta_id_actas_reunion_id_fk;
    ALTER TABLE compromisos_acta DROP CONSTRAINT IF EXISTS compromisos_acta_acta_id_actas_reunion_id_fk;
    ALTER TABLE aprobaciones_acta_participante DROP CONSTRAINT IF EXISTS aprobaciones_acta_participante_acta_id_actas_reunion_id_fk;
    ALTER TABLE documentos_acta DROP CONSTRAINT IF EXISTS documentos_acta_acta_id_actas_reunion_id_fk;
    ALTER TABLE historial_acta DROP CONSTRAINT IF EXISTS historial_acta_acta_id_actas_reunion_id_fk;
    ALTER TABLE actas_reunion_actividades DROP CONSTRAINT IF EXISTS actas_reunion_actividades_acta_id_actas_reunion_id_fk;
    ALTER TABLE actas_reunion_clientes DROP CONSTRAINT IF EXISTS actas_reunion_clientes_acta_id_actas_reunion_id_fk;

    -- 6. En tablas hijas: quitar acta_id (integer) y renombrar acta_id_uuid -> acta_id
    ALTER TABLE actas_integrantes DROP COLUMN IF EXISTS acta_id;
    ALTER TABLE actas_integrantes RENAME COLUMN acta_id_uuid TO acta_id;
    ALTER TABLE compromisos_acta DROP COLUMN IF EXISTS acta_id;
    ALTER TABLE compromisos_acta RENAME COLUMN acta_id_uuid TO acta_id;
    ALTER TABLE aprobaciones_acta_participante DROP COLUMN IF EXISTS acta_id;
    ALTER TABLE aprobaciones_acta_participante RENAME COLUMN acta_id_uuid TO acta_id;
    ALTER TABLE documentos_acta DROP COLUMN IF EXISTS acta_id;
    ALTER TABLE documentos_acta RENAME COLUMN acta_id_uuid TO acta_id;
    ALTER TABLE historial_acta DROP COLUMN IF EXISTS acta_id;
    ALTER TABLE historial_acta RENAME COLUMN acta_id_uuid TO acta_id;
    ALTER TABLE actas_reunion_actividades DROP COLUMN IF EXISTS acta_id;
    ALTER TABLE actas_reunion_actividades RENAME COLUMN acta_id_uuid TO acta_id;
    ALTER TABLE actas_reunion_clientes DROP COLUMN IF EXISTS acta_id;
    ALTER TABLE actas_reunion_clientes RENAME COLUMN acta_id_uuid TO acta_id;

    -- 7. En actas_reunion: quitar PK, quitar id (integer), renombrar id_uuid -> id, añadir PK
    ALTER TABLE actas_reunion DROP CONSTRAINT IF EXISTS actas_reunion_pkey;
    ALTER TABLE actas_reunion DROP COLUMN IF EXISTS id;
    ALTER TABLE actas_reunion RENAME COLUMN id_uuid TO id;
    ALTER TABLE actas_reunion ADD PRIMARY KEY (id);
    ALTER TABLE actas_reunion ALTER COLUMN id SET DEFAULT gen_random_uuid();

    -- 8. Recrear FKs de tablas hijas hacia actas_reunion(id)
    ALTER TABLE actas_integrantes ADD CONSTRAINT actas_integrantes_acta_id_actas_reunion_id_fk FOREIGN KEY (acta_id) REFERENCES actas_reunion(id) ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE compromisos_acta ADD CONSTRAINT compromisos_acta_acta_id_actas_reunion_id_fk FOREIGN KEY (acta_id) REFERENCES actas_reunion(id) ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE aprobaciones_acta_participante ADD CONSTRAINT aprobaciones_acta_participante_acta_id_actas_reunion_id_fk FOREIGN KEY (acta_id) REFERENCES actas_reunion(id) ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE documentos_acta ADD CONSTRAINT documentos_acta_acta_id_actas_reunion_id_fk FOREIGN KEY (acta_id) REFERENCES actas_reunion(id) ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE historial_acta ADD CONSTRAINT historial_acta_acta_id_actas_reunion_id_fk FOREIGN KEY (acta_id) REFERENCES actas_reunion(id) ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE actas_reunion_actividades ADD CONSTRAINT actas_reunion_actividades_acta_id_actas_reunion_id_fk FOREIGN KEY (acta_id) REFERENCES actas_reunion(id) ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE actas_reunion_clientes ADD CONSTRAINT actas_reunion_clientes_acta_id_actas_reunion_id_fk FOREIGN KEY (acta_id) REFERENCES actas_reunion(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
