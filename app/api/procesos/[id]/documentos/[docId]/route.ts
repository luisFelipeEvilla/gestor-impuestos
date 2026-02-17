import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documentosProceso } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { readProcesoDocument } from "@/lib/uploads";

type Params = { params: Promise<{ id: string; docId: string }> };

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: Params) {
  const { id: procesoIdStr, docId: docIdStr } = await params;
  const procesoId = parseInt(procesoIdStr, 10);
  const docId = parseInt(docIdStr, 10);

  if (Number.isNaN(procesoId) || Number.isNaN(docId)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const [doc] = await db
    .select()
    .from(documentosProceso)
    .where(
      and(
        eq(documentosProceso.id, docId),
        eq(documentosProceso.procesoId, procesoId)
      )
    );

  if (!doc) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  try {
    const buffer = await readProcesoDocument(doc.rutaArchivo);
    const disposition = `inline; filename="${encodeURIComponent(doc.nombreOriginal)}"`;
    const body = new Uint8Array(buffer);
    return new NextResponse(body, {
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
