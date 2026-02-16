import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  documentosCompromisoActa,
  compromisosActaHistorial,
  compromisosActa,
  actasIntegrantes,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { readCompromisoDocument } from "@/lib/uploads";
import { getSession } from "@/lib/auth-server";

type Params = { params: Promise<{ compromisoId: string; docId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { compromisoId: compromisoIdStr, docId: docIdStr } = await params;
  const compromisoId = parseInt(compromisoIdStr, 10);
  const docId = parseInt(docIdStr, 10);

  if (!Number.isInteger(compromisoId) || compromisoId < 1 || !Number.isInteger(docId) || docId < 1) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [doc] = await db
    .select({
      id: documentosCompromisoActa.id,
      compromisoActaHistorialId: documentosCompromisoActa.compromisoActaHistorialId,
      nombreOriginal: documentosCompromisoActa.nombreOriginal,
      mimeType: documentosCompromisoActa.mimeType,
      rutaArchivo: documentosCompromisoActa.rutaArchivo,
    })
    .from(documentosCompromisoActa)
    .where(eq(documentosCompromisoActa.id, docId));

  if (!doc) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const [historial] = await db
    .select({ compromisoActaId: compromisosActaHistorial.compromisoActaId })
    .from(compromisosActaHistorial)
    .where(
      and(
        eq(compromisosActaHistorial.id, doc.compromisoActaHistorialId),
        eq(compromisosActaHistorial.compromisoActaId, compromisoId)
      )
    );
  if (!historial) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const [compromiso] = await db
    .select({ actaId: compromisosActa.actaId })
    .from(compromisosActa)
    .where(eq(compromisosActa.id, compromisoId));
  if (!compromiso) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (session.user.rol !== "admin") {
    const [participa] = await db
      .select({ id: actasIntegrantes.id })
      .from(actasIntegrantes)
      .where(
        and(
          eq(actasIntegrantes.actaId, compromiso.actaId),
          eq(actasIntegrantes.usuarioId, session.user.id)
        )
      );
    if (!participa) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  try {
    const buffer = await readCompromisoDocument(doc.rutaArchivo);
    const disposition = `attachment; filename="${encodeURIComponent(doc.nombreOriginal)}"`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": disposition,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Error al leer el archivo" },
      { status: 500 }
    );
  }
}
