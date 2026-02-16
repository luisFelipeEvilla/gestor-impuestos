/**
 * Categorías de documentos y notas del proceso.
 * Usado en documentos_proceso.categoria y historial_proceso.categoria_nota.
 */
export const CATEGORIAS_DOCUMENTO_NOTA = [
  "general",
  "en_contacto",
  "acuerdo_pago",
  "cobro_coactivo",
  "evidencia_notificacion",
] as const;

export type CategoriaDocumentoNota = (typeof CATEGORIAS_DOCUMENTO_NOTA)[number];

/** Resultado de las server actions de documentos de proceso */
export type EstadoDocumentoProceso = { error?: string };
