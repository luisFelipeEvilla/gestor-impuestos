"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { documentosProceso, procesos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import {
  saveProcesoDocument,
  deleteProcesoDocument,
  isAllowedMime,
  isAllowedSize,
  useS3,
  isAllowedSizeForS3,
  createPresignedPutUrl,
  generateNewProcesoDocumentPath,
} from "@/lib/uploads";
import {
  CATEGORIAS_DOCUMENTO_NOTA,
  type CategoriaDocumentoNota,
  type EstadoDocumentoProceso,
} from "@/lib/proceso-categorias";
import {
  TIPOS_DOCUMENTO_PROCESO,
  type TipoDocumentoProceso,
} from "@/lib/tipos-documento-proceso";

const TIPOS_DOCUMENTO_VALIDOS = new Set(TIPOS_DOCUMENTO_PROCESO.map((t) => t.value));

export type PresignedDocumentoProcesoResult = {
  url?: string;
  rutaArchivo?: string;
  error?: string;
};

/** Obtiene URL pre-firmada para subir directo a S3. Si no hay S3, devuelve error para usar subida por servidor. */
export async function obtenerPresignedUrlDocumentoProceso(
  procesoId: number,
  nombreOriginal: string,
  mimeType: string,
  tamano: number,
  categoria: CategoriaDocumentoNota
): Promise<PresignedDocumentoProcesoResult> {
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  if (!nombreOriginal?.trim()) return { error: "Nombre de archivo requerido." };
  if (!CATEGORIAS_DOCUMENTO_NOTA.includes(categoria)) return { error: "Categoría inválida." };
  if (!isAllowedMime(mimeType)) {
    return { error: "Tipo de archivo no permitido. Usa PDF, imágenes, Word, Excel o texto." };
  }
  if (!useS3()) return { error: "DIRECT_UPLOAD" };
  if (!isAllowedSizeForS3(tamano)) {
    return { error: "El archivo supera el tamaño máximo para subida directa (100 MB)." };
  }

  try {
    const session = await getSession();
    const [proceso] = await db
      .select({ id: procesos.id, asignadoAId: procesos.asignadoAId })
      .from(procesos)
      .where(eq(procesos.id, procesoId));
    if (!proceso) return { error: "Proceso no encontrado." };
    const esAdmin = session?.user?.rol === "admin";
    const esAsignado = session?.user?.id != null && proceso.asignadoAId === session.user.id;
    if (!esAdmin && !esAsignado) {
      return { error: "No tienes permiso para subir documentos a este proceso." };
    }

    const rutaArchivo = generateNewProcesoDocumentPath(procesoId, nombreOriginal);
    const url = await createPresignedPutUrl(rutaArchivo, mimeType);
    return { url, rutaArchivo };
  } catch (err) {
    console.error(err);
    return { error: "Error al generar la URL de subida." };
  }
}

/** Registra en BD un documento de proceso ya subido a S3. */
export async function registrarDocumentoProceso(
  procesoId: number,
  rutaArchivo: string,
  nombreOriginal: string,
  mimeType: string,
  tamano: number,
  categoria: CategoriaDocumentoNota,
  tipoDocumento: TipoDocumentoProceso = "otro"
): Promise<EstadoDocumentoProceso> {
  if (!Number.isInteger(procesoId) || procesoId < 1) return { error: "Proceso inválido." };
  if (!rutaArchivo?.trim() || !nombreOriginal?.trim()) return { error: "Datos del archivo incompletos." };
  if (!CATEGORIAS_DOCUMENTO_NOTA.includes(categoria)) return { error: "Categoría inválida." };
  if (!TIPOS_DOCUMENTO_VALIDOS.has(tipoDocumento)) return { error: "Tipo de documento inválido." };
  if (!isAllowedMime(mimeType)) return { error: "Tipo de archivo no permitido." };

  try {
    const session = await getSession();
    const [proceso] = await db
      .select({ id: procesos.id, asignadoAId: procesos.asignadoAId })
      .from(procesos)
      .where(eq(procesos.id, procesoId));
    if (!proceso) return { error: "Proceso no encontrado." };
    const esAdmin = session?.user?.rol === "admin";
    const esAsignado = session?.user?.id != null && proceso.asignadoAId === session.user.id;
    if (!esAdmin && !esAsignado) {
      return { error: "No tienes permiso para subir documentos a este proceso." };
    }

    await db.insert(documentosProceso).values({
      procesoId,
      subidoPorId: session?.user?.id ?? null,
      categoria,
      tipoDocumento,
      nombreOriginal,
      rutaArchivo,
      mimeType,
      tamano,
    });

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath(`/procesos/${procesoId}/editar`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string"
    ) {
      throw err;
    }
    console.error(err);
    return { error: "Error al registrar el documento." };
  }
}

export async function subirDocumentoProceso(
  formData: FormData
): Promise<EstadoDocumentoProceso> {
  const procesoIdRaw = formData.get("procesoId");
  const procesoId = typeof procesoIdRaw === "string" ? parseInt(procesoIdRaw, 10) : Number(procesoIdRaw);
  const categoriaRaw = (formData.get("categoria") as string)?.trim() || "general";
  const tipoDocumentoRaw = (formData.get("tipoDocumento") as string)?.trim() || "otro";
  const file = formData.get("archivo") as File | null;

  if (!Number.isInteger(procesoId) || procesoId < 1) {
    return { error: "Proceso inválido." };
  }
  if (!CATEGORIAS_DOCUMENTO_NOTA.includes(categoriaRaw as CategoriaDocumentoNota)) {
    return { error: "Categoría de documento inválida." };
  }
  if (!TIPOS_DOCUMENTO_VALIDOS.has(tipoDocumentoRaw as TipoDocumentoProceso)) {
    return { error: "Tipo de documento inválido." };
  }
  const categoria = categoriaRaw as CategoriaDocumentoNota;
  const tipoDocumento = tipoDocumentoRaw as TipoDocumentoProceso;
  if (!file || file.size === 0) {
    return { error: "Selecciona un archivo." };
  }
  if (!isAllowedSize(file.size)) {
    return { error: "El archivo supera el tamaño máximo permitido (10 MB)." };
  }
  if (!isAllowedMime(file.type)) {
    return {
      error:
        "Tipo de archivo no permitido. Usa PDF, imágenes, Word, Excel o texto.",
    };
  }

  try {
    const session = await getSession();
    const [proceso] = await db
      .select({ id: procesos.id, asignadoAId: procesos.asignadoAId })
      .from(procesos)
      .where(eq(procesos.id, procesoId));
    if (!proceso) return { error: "Proceso no encontrado." };
    const esAdmin = session?.user?.rol === "admin";
    const esAsignado = session?.user?.id != null && proceso.asignadoAId === session.user.id;
    if (!esAdmin && !esAsignado) {
      return { error: "No tienes permiso para subir documentos a este proceso." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storedFileName = await saveProcesoDocument(
      procesoId,
      buffer,
      file.name,
      file.type
    );
    const rutaArchivo = `procesos/${procesoId}/${storedFileName}`;

    await db.insert(documentosProceso).values({
      procesoId,
      subidoPorId: session?.user?.id ?? null,
      categoria,
      tipoDocumento,
      nombreOriginal: file.name,
      rutaArchivo,
      mimeType: file.type,
      tamano: file.size,
    });

    revalidatePath(`/procesos/${procesoId}`);
    revalidatePath(`/procesos/${procesoId}/editar`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string"
    ) {
      throw err;
    }
    console.error(err);
    return { error: "Error al subir el archivo." };
  }
}

export async function eliminarDocumentoProceso(
  formData: FormData
): Promise<EstadoDocumentoProceso> {
  const docIdRaw = formData.get("documentoId");
  const docId = typeof docIdRaw === "string" ? parseInt(docIdRaw, 10) : Number(docIdRaw);

  if (!Number.isInteger(docId) || docId < 1) {
    return { error: "Documento inválido." };
  }

  try {
    const session = await getSession();
    const [doc] = await db
      .select({ id: documentosProceso.id, procesoId: documentosProceso.procesoId, rutaArchivo: documentosProceso.rutaArchivo })
      .from(documentosProceso)
      .where(eq(documentosProceso.id, docId));
    if (!doc) return { error: "Documento no encontrado." };
    const [proceso] = await db
      .select({ asignadoAId: procesos.asignadoAId })
      .from(procesos)
      .where(eq(procesos.id, doc.procesoId));
    if (proceso) {
      const esAdmin = session?.user?.rol === "admin";
      const esAsignado = session?.user?.id != null && proceso.asignadoAId === session.user.id;
      if (!esAdmin && !esAsignado) {
        return { error: "No tienes permiso para eliminar documentos de este proceso." };
      }
    }

    await db.delete(documentosProceso).where(eq(documentosProceso.id, docId));
    try {
      await deleteProcesoDocument(doc.rutaArchivo);
    } catch {
      // Archivo ya borrado en disco; ignorar
    }

    revalidatePath(`/procesos/${doc.procesoId}`);
    revalidatePath(`/procesos/${doc.procesoId}/editar`);
    revalidatePath("/procesos");
    return {};
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string"
    ) {
      throw err;
    }
    console.error(err);
    return { error: "Error al eliminar el documento." };
  }
}
