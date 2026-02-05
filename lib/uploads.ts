import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR_ENV = "UPLOAD_DIR";
const DEFAULT_UPLOAD_DIR = "uploads";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_PREFIXES = [
  "application/pdf",
  "image/",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument", // .docx, .xlsx, etc.
  "text/plain",
  "text/csv",
];

export function getUploadRoot(): string {
  const root = process.env[UPLOAD_DIR_ENV] ?? path.join(process.cwd(), DEFAULT_UPLOAD_DIR);
  return path.resolve(root);
}

export function getProcesoUploadDir(procesoId: number): string {
  return path.join(getUploadRoot(), "procesos", String(procesoId));
}

export function getRelativePath(procesoId: number, storedFileName: string): string {
  return path.join("procesos", String(procesoId), storedFileName);
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export function isAllowedMime(mimeType: string): boolean {
  return ALLOWED_MIME_PREFIXES.some(
    (prefix) => mimeType === prefix || mimeType.startsWith(prefix)
  );
}

export function isAllowedSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE_BYTES;
}

/**
 * Sanitiza el nombre original para usarlo como parte del nombre almacenado (solo extensión segura).
 */
function getSafeExtension(nombreOriginal: string): string {
  const ext = path.extname(nombreOriginal).toLowerCase().replace(/[^a-z0-9.]/g, "");
  return ext || "";
}

/**
 * Guarda un archivo en el directorio del proceso. Retorna el nombre del archivo almacenado (no la ruta completa).
 */
export async function saveProcesoDocument(
  procesoId: number,
  buffer: Buffer,
  nombreOriginal: string,
  mimeType: string
): Promise<string> {
  const dir = getProcesoUploadDir(procesoId);
  await ensureDir(dir);
  const ext = getSafeExtension(nombreOriginal);
  const storedFileName = `${randomUUID()}${ext ? `.${ext.replace(/^\./, "")}` : ""}`;
  const fullPath = path.join(dir, storedFileName);
  await writeFile(fullPath, buffer);
  return storedFileName;
}

/**
 * Elimina un archivo por ruta relativa al upload root.
 */
export async function deleteProcesoDocument(rutaRelativa: string): Promise<void> {
  const root = getUploadRoot();
  const fullPath = path.join(root, rutaRelativa);
  await unlink(fullPath);
}

/**
 * Lee un archivo por ruta relativa al upload root.
 */
export async function readProcesoDocument(rutaRelativa: string): Promise<Buffer> {
  const root = getUploadRoot();
  const fullPath = path.join(root, rutaRelativa);
  return readFile(fullPath);
}

/**
 * Resuelve la ruta absoluta de un documento (solo para verificación de existencia si se necesita).
 */
export function resolveDocumentPath(rutaRelativa: string): string {
  return path.join(getUploadRoot(), rutaRelativa);
}

export { MAX_FILE_SIZE_BYTES };
