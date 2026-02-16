import { createHmac } from "crypto";

const PAYLOAD_PREFIX = "acta:";
const PAYLOAD_SEP = ":integrante:";

function getSecret(): string {
  const secret = process.env.NEXT_AUTH_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error("NEXTAUTH_SECRET is required for acta approval links.");
  }
  return secret;
}

/**
 * Genera la firma HMAC-SHA256 para el enlace de aprobación del participante.
 * Payload: "acta:{actaId}:integrante:{integranteId}"
 */
export function generarFirmaAprobacion(
  actaId: string,
  integranteId: number
): string {
  const payload = `${PAYLOAD_PREFIX}${actaId}${PAYLOAD_SEP}${integranteId}`;
  const hmac = createHmac("sha256", getSecret());
  hmac.update(payload);
  return hmac.digest("hex");
}

/**
 * Verifica que la firma coincida con actaId e integranteId.
 * Comparación en tiempo constante para evitar timing attacks.
 */
export function verificarFirmaAprobacion(
  actaId: string,
  integranteId: number,
  firma: string
): boolean {
  if (!firma || typeof firma !== "string" || firma.trim() === "") {
    return false;
  }
  try {
    const expected = generarFirmaAprobacion(actaId, integranteId);
    if (expected.length !== firma.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ firma.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}

const PAYLOAD_DOC = ":doc:";

/**
 * Genera la firma HMAC para el enlace de descarga de un documento por un participante.
 * Payload: "acta:{actaId}:integrante:{integranteId}:doc:{docId}"
 */
export function generarFirmaDescargaDocumento(
  actaId: string,
  integranteId: number,
  docId: number
): string {
  const payload = `${PAYLOAD_PREFIX}${actaId}${PAYLOAD_SEP}${integranteId}${PAYLOAD_DOC}${docId}`;
  const hmac = createHmac("sha256", getSecret());
  hmac.update(payload);
  return hmac.digest("hex");
}

/**
 * Verifica la firma de descarga de documento (comparación en tiempo constante).
 */
export function verificarFirmaDescargaDocumento(
  actaId: string,
  integranteId: number,
  docId: number,
  firma: string
): boolean {
  if (!firma || typeof firma !== "string" || firma.trim() === "") {
    return false;
  }
  try {
    const expected = generarFirmaDescargaDocumento(actaId, integranteId, docId);
    if (expected.length !== firma.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ firma.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}
