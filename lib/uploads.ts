import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_DIR_ENV = "UPLOAD_DIR";
const DEFAULT_UPLOAD_DIR = "uploads";
const S3_BUCKET_ENV = "S3_BUCKET";
const S3_PREFIX_ENV = "S3_PREFIX";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
/** Límite para subida directa a S3 (presigned); no aplica límite de Vercel. */
const MAX_FILE_SIZE_S3_BYTES = 100 * 1024 * 1024; // 100 MB
const ALLOWED_MIME_PREFIXES = [
  "application/pdf",
  "image/",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument", // .docx, .xlsx, etc.
  "text/plain",
  "text/csv",
];

export function useS3(): boolean {
  return Boolean(process.env[S3_BUCKET_ENV]?.trim());
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.AWS_REGION?.trim() || "us-east-1";
    s3Client = new S3Client({ region });
  }
  return s3Client;
}

function getS3Bucket(): string {
  const bucket = process.env[S3_BUCKET_ENV]?.trim();
  if (!bucket) throw new Error("S3_BUCKET is not configured");
  return bucket;
}

/** Convierte ruta relativa (guardada en BD) a clave S3. */
function getS3Key(rutaRelativa: string): string {
  const prefix = process.env[S3_PREFIX_ENV]?.trim() ?? "";
  const normalized = rutaRelativa.replace(/\\/g, "/");
  return prefix ? `${prefix.replace(/\/$/, "")}/${normalized}` : normalized;
}

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

export function getActaUploadDir(actaId: string): string {
  return path.join(getUploadRoot(), "actas", String(actaId));
}

export function getActaRelativePath(actaId: string, storedFileName: string): string {
  return path.join("actas", String(actaId), storedFileName);
}

export function getCompromisoUploadDir(compromisoId: number): string {
  return path.join(getUploadRoot(), "compromisos", String(compromisoId));
}

export function getCompromisoRelativePath(compromisoId: number, storedFileName: string): string {
  return path.join("compromisos", String(compromisoId), storedFileName);
}

const APROBACION_FOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const APROBACION_FOTO_MIMES = ["image/jpeg", "image/png", "image/webp"];

export function getAprobacionFotoDir(actaId: string): string {
  return path.join(getUploadRoot(), "actas", String(actaId), "aprobaciones");
}

export function getAprobacionFotoRelativePath(actaId: string, storedFileName: string): string {
  return path.join("actas", String(actaId), "aprobaciones", storedFileName);
}

export function isAllowedAprobacionFotoMime(mimeType: string): boolean {
  return APROBACION_FOTO_MIMES.includes(mimeType);
}

export function isAllowedAprobacionFotoSize(size: number): boolean {
  return size > 0 && size <= APROBACION_FOTO_MAX_BYTES;
}

export async function ensureDir(dir: string): Promise<void> {
  if (useS3()) return;
  await mkdir(dir, { recursive: true });
}

/**
 * Guarda la foto de aprobación de un participante. Solo imágenes (JPEG, PNG, WebP), máx 5 MB.
 * Retorna la ruta relativa al upload root para guardar en BD.
 */
export async function saveAprobacionFoto(
  actaId: string,
  buffer: Buffer,
  nombreOriginal: string,
  mimeType: string
): Promise<string> {
  if (!isAllowedAprobacionFotoMime(mimeType)) {
    throw new Error("Tipo de archivo no permitido. Use JPEG, PNG o WebP.");
  }
  if (!isAllowedAprobacionFotoSize(buffer.length)) {
    throw new Error("La imagen no debe superar 5 MB.");
  }
  const ext = getSafeExtension(nombreOriginal) || ".jpg";
  const safeExt = ext.startsWith(".") ? ext.slice(1) : ext;
  const storedFileName = `${randomUUID()}.${safeExt.replace(/[^a-z0-9]/g, "")}`;
  const rutaRelativa = getAprobacionFotoRelativePath(actaId, storedFileName);

  if (useS3()) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getS3Bucket(),
        Key: getS3Key(rutaRelativa),
        Body: buffer,
        ContentType: mimeType,
      })
    );
    return rutaRelativa;
  }

  const dir = getAprobacionFotoDir(actaId);
  await ensureDir(dir);
  const fullPath = path.join(getUploadRoot(), rutaRelativa);
  await writeFile(fullPath, buffer);
  return rutaRelativa;
}

/**
 * Lee la foto de aprobación por ruta relativa al upload root.
 */
export async function readAprobacionFoto(rutaRelativa: string): Promise<Buffer> {
  if (useS3()) {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: getS3Bucket(),
        Key: getS3Key(rutaRelativa),
      })
    );
    const body = response.Body;
    if (!body) throw new Error("Empty S3 object");
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  const root = getUploadRoot();
  const fullPath = path.join(root, rutaRelativa);
  return readFile(fullPath);
}

export function isAllowedMime(mimeType: string): boolean {
  return ALLOWED_MIME_PREFIXES.some(
    (prefix) => mimeType === prefix || mimeType.startsWith(prefix)
  );
}

export function isAllowedSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE_BYTES;
}

export function isAllowedSizeForS3(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE_S3_BYTES;
}

/**
 * Genera una URL pre-firmada para que el cliente suba el archivo directo a S3 (PUT).
 * Solo cuando useS3() es true. El cliente debe hacer PUT con el mismo Content-Type.
 */
export async function createPresignedPutUrl(
  rutaRelativa: string,
  contentType: string,
  expiresInSeconds: number = 900
): Promise<string> {
  if (!useS3()) throw new Error("S3 not configured");
  const command = new PutObjectCommand({
    Bucket: getS3Bucket(),
    Key: getS3Key(rutaRelativa),
    ContentType: contentType,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds });
}

/**
 * Sanitiza el nombre original para usarlo como parte del nombre almacenado (solo extensión segura).
 */
function getSafeExtension(nombreOriginal: string): string {
  const ext = path.extname(nombreOriginal).toLowerCase().replace(/[^a-z0-9.]/g, "");
  return ext || "";
}

/**
 * Genera la ruta relativa para un nuevo documento de acta (para uso con presigned URL).
 * Devuelve la ruta con barras normales para guardar en BD.
 */
export function generateNewActaDocumentPath(actaId: string, nombreOriginal: string): string {
  const ext = getSafeExtension(nombreOriginal);
  const storedFileName = `${randomUUID()}${ext ? `.${ext.replace(/^\./, "")}` : ""}`;
  return getActaRelativePath(actaId, storedFileName).replace(/\\/g, "/");
}

/**
 * Genera la ruta relativa para un nuevo documento de proceso (para uso con presigned URL).
 * Devuelve la ruta con barras normales para guardar en BD.
 */
export function generateNewProcesoDocumentPath(procesoId: number, nombreOriginal: string): string {
  const ext = getSafeExtension(nombreOriginal);
  const storedFileName = `${randomUUID()}${ext ? `.${ext.replace(/^\./, "")}` : ""}`;
  return getRelativePath(procesoId, storedFileName).replace(/\\/g, "/");
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
  const ext = getSafeExtension(nombreOriginal);
  const storedFileName = `${randomUUID()}${ext ? `.${ext.replace(/^\./, "")}` : ""}`;
  const rutaRelativa = getRelativePath(procesoId, storedFileName);

  if (useS3()) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getS3Bucket(),
        Key: getS3Key(rutaRelativa),
        Body: buffer,
        ContentType: mimeType,
      })
    );
    return storedFileName;
  }

  const dir = getProcesoUploadDir(procesoId);
  await ensureDir(dir);
  const fullPath = path.join(getUploadRoot(), rutaRelativa);
  await writeFile(fullPath, buffer);
  return storedFileName;
}

/**
 * Elimina un archivo por ruta relativa al upload root.
 */
export async function deleteProcesoDocument(rutaRelativa: string): Promise<void> {
  if (useS3()) {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: getS3Bucket(),
        Key: getS3Key(rutaRelativa),
      })
    );
    return;
  }
  const root = getUploadRoot();
  const fullPath = path.join(root, rutaRelativa);
  await unlink(fullPath);
}

/**
 * Lee un archivo por ruta relativa al upload root.
 */
export async function readProcesoDocument(rutaRelativa: string): Promise<Buffer> {
  if (useS3()) {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: getS3Bucket(),
        Key: getS3Key(rutaRelativa),
      })
    );
    const body = response.Body;
    if (!body) throw new Error("Empty S3 object");
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  const root = getUploadRoot();
  const fullPath = path.join(root, rutaRelativa);
  return readFile(fullPath);
}

/**
 * Guarda un archivo en el directorio del acta. Retorna el nombre del archivo almacenado (no la ruta completa).
 */
export async function saveActaDocument(
  actaId: string,
  buffer: Buffer,
  nombreOriginal: string,
  mimeType: string
): Promise<string> {
  const ext = getSafeExtension(nombreOriginal);
  const storedFileName = `${randomUUID()}${ext ? `.${ext.replace(/^\./, "")}` : ""}`;
  const rutaRelativa = getActaRelativePath(actaId, storedFileName);

  if (useS3()) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getS3Bucket(),
        Key: getS3Key(rutaRelativa),
        Body: buffer,
        ContentType: mimeType,
      })
    );
    return storedFileName;
  }

  const dir = getActaUploadDir(actaId);
  await ensureDir(dir);
  const fullPath = path.join(getUploadRoot(), rutaRelativa);
  await writeFile(fullPath, buffer);
  return storedFileName;
}

/**
 * Guarda un archivo en el directorio del compromiso (actualización). Retorna el nombre del archivo almacenado.
 */
export async function saveCompromisoDocument(
  compromisoId: number,
  buffer: Buffer,
  nombreOriginal: string,
  mimeType: string
): Promise<string> {
  const ext = getSafeExtension(nombreOriginal);
  const storedFileName = `${randomUUID()}${ext ? `.${ext.replace(/^\./, "")}` : ""}`;
  const rutaRelativa = getCompromisoRelativePath(compromisoId, storedFileName);

  if (useS3()) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getS3Bucket(),
        Key: getS3Key(rutaRelativa),
        Body: buffer,
        ContentType: mimeType,
      })
    );
    return storedFileName;
  }

  const dir = getCompromisoUploadDir(compromisoId);
  await ensureDir(dir);
  const fullPath = path.join(getUploadRoot(), rutaRelativa);
  await writeFile(fullPath, buffer);
  return storedFileName;
}

/**
 * Elimina un archivo de compromiso por ruta relativa al upload root.
 */
export async function deleteCompromisoDocument(rutaRelativa: string): Promise<void> {
  if (useS3()) {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: getS3Bucket(),
        Key: getS3Key(rutaRelativa),
      })
    );
    return;
  }
  const root = getUploadRoot();
  const fullPath = path.join(root, rutaRelativa);
  await unlink(fullPath);
}

/**
 * Lee un archivo de compromiso por ruta relativa al upload root.
 */
export async function readCompromisoDocument(rutaRelativa: string): Promise<Buffer> {
  if (useS3()) {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: getS3Bucket(),
        Key: getS3Key(rutaRelativa),
      })
    );
    const body = response.Body;
    if (!body) throw new Error("Empty S3 object");
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  const root = getUploadRoot();
  const fullPath = path.join(root, rutaRelativa);
  return readFile(fullPath);
}

/**
 * Elimina un archivo de acta por ruta relativa al upload root.
 */
export async function deleteActaDocument(rutaRelativa: string): Promise<void> {
  if (useS3()) {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: getS3Bucket(),
        Key: getS3Key(rutaRelativa),
      })
    );
    return;
  }
  const root = getUploadRoot();
  const fullPath = path.join(root, rutaRelativa);
  await unlink(fullPath);
}

/**
 * Lee un archivo de acta por ruta relativa al upload root.
 */
export async function readActaDocument(rutaRelativa: string): Promise<Buffer> {
  if (useS3()) {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: getS3Bucket(),
        Key: getS3Key(rutaRelativa),
      })
    );
    const body = response.Body;
    if (!body) throw new Error("Empty S3 object");
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  const root = getUploadRoot();
  const fullPath = path.join(root, rutaRelativa);
  return readFile(fullPath);
}

/**
 * Resuelve la ruta absoluta de un documento (solo para verificación de existencia si se necesita).
 * Con S3 no hay ruta local; devuelve la clave lógica para referencia.
 */
export function resolveDocumentPath(rutaRelativa: string): string {
  if (useS3()) return getS3Key(rutaRelativa);
  return path.join(getUploadRoot(), rutaRelativa);
}

export { MAX_FILE_SIZE_BYTES };
