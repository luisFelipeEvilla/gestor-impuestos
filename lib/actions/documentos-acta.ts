"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { documentosActa, actasReunion } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  saveActaDocument,
  deleteActaDocument,
  isAllowedMime,
  isAllowedSize,
} from "@/lib/uploads";

export type EstadoDocumentoActa = {
  error?: string;
};

export async function subirDocumentoActa(
  formData: FormData
): Promise<EstadoDocumentoActa> {
  const actaIdRaw = formData.get("actaId");
  const actaId = typeof actaIdRaw === "string" ? parseInt(actaIdRaw, 10) : Number(actaIdRaw);
  const file = formData.get("archivo") as File | null;

  if (!Number.isInteger(actaId) || actaId < 1) {
    return { error: "Acta inválida." };
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
    const [acta] = await db
      .select({ id: actasReunion.id })
      .from(actasReunion)
      .where(eq(actasReunion.id, actaId));
    if (!acta) return { error: "Acta no encontrada." };

    const buffer = Buffer.from(await file.arrayBuffer());
    const storedFileName = await saveActaDocument(
      actaId,
      buffer,
      file.name,
      file.type
    );
    const rutaArchivo = `actas/${actaId}/${storedFileName}`;

    await db.insert(documentosActa).values({
      actaId,
      nombreOriginal: file.name,
      rutaArchivo,
      mimeType: file.type,
      tamano: file.size,
    });

    revalidatePath(`/actas/${actaId}`);
    revalidatePath(`/actas/${actaId}/editar`);
    revalidatePath("/actas");
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

export async function eliminarDocumentoActa(
  formData: FormData
): Promise<EstadoDocumentoActa> {
  const docIdRaw = formData.get("documentoId");
  const docId = typeof docIdRaw === "string" ? parseInt(docIdRaw, 10) : Number(docIdRaw);

  if (!Number.isInteger(docId) || docId < 1) {
    return { error: "Documento inválido." };
  }

  try {
    const [doc] = await db
      .select({
        id: documentosActa.id,
        actaId: documentosActa.actaId,
        rutaArchivo: documentosActa.rutaArchivo,
      })
      .from(documentosActa)
      .where(eq(documentosActa.id, docId));
    if (!doc) return { error: "Documento no encontrado." };

    await db.delete(documentosActa).where(eq(documentosActa.id, docId));
    try {
      await deleteActaDocument(doc.rutaArchivo);
    } catch {
      // Archivo ya borrado en disco; ignorar
    }

    revalidatePath(`/actas/${doc.actaId}`);
    revalidatePath(`/actas/${doc.actaId}/editar`);
    revalidatePath("/actas");
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
