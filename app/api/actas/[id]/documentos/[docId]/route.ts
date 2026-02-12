import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documentosActa } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { readActaDocument } from "@/lib/uploads";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id: actaIdStr, docId: docIdStr } = await params;
  const actaId = parseInt(actaIdStr, 10);
  const docId = parseInt(docIdStr, 10);

  if (Number.isNaN(actaId) || Number.isNaN(docId)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const [doc] = await db
    .select()
    .from(documentosActa)
    .where(
      and(
        eq(documentosActa.id, docId),
        eq(documentosActa.actaId, actaId)
      )
    );

  if (!doc) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  try {
    const buffer = await readActaDocument(doc.rutaArchivo);
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
