"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { documentosProceso, procesos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  saveProcesoDocument,
  deleteProcesoDocument,
  isAllowedMime,
  isAllowedSize,
} from "@/lib/uploads";

export type EstadoDocumentoProceso = { error?: string };

export async function subirDocumentoProceso(
  formData: FormData
): Promise<EstadoDocumentoProceso> {
  const procesoIdRaw = formData.get("procesoId");
  const procesoId = typeof procesoIdRaw === "string" ? parseInt(procesoIdRaw, 10) : Number(procesoIdRaw);
  const file = formData.get("archivo") as File | null;

  if (!Number.isInteger(procesoId) || procesoId < 1) {
    return { error: "Proceso inválido." };
  }
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
    const [proceso] = await db
      .select({ id: procesos.id })
      .from(procesos)
      .where(eq(procesos.id, procesoId));
    if (!proceso) return { error: "Proceso no encontrado." };

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
    const [doc] = await db
      .select({ id: documentosProceso.id, procesoId: documentosProceso.procesoId, rutaArchivo: documentosProceso.rutaArchivo })
      .from(documentosProceso)
      .where(eq(documentosProceso.id, docId));
    if (!doc) return { error: "Documento no encontrado." };

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
