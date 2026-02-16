-- Documentos adjuntos a actualizaciones de compromisos (historial)
CREATE TABLE IF NOT EXISTS "documentos_compromiso_acta" (
  "id" serial PRIMARY KEY NOT NULL,
  "compromiso_acta_historial_id" integer NOT NULL REFERENCES "compromisos_acta_historial"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "nombre_original" text NOT NULL,
  "ruta_archivo" text NOT NULL,
  "mime_type" text NOT NULL,
  "tamano" integer NOT NULL,
  "creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
