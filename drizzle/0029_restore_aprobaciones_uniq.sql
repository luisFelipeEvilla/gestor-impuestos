DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname = 'aprobaciones_acta_integrante_uniq'
  ) THEN
    ALTER TABLE aprobaciones_acta_participante
    ADD CONSTRAINT aprobaciones_acta_integrante_uniq UNIQUE (acta_id, acta_integrante_id);
  END IF;
END $$;
