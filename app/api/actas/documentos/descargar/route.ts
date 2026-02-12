import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { actasReunion, actasIntegrantes, documentosActa } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { readActaDocument } from "@/lib/uploads";
import { verificarFirmaDescargaDocumento } from "@/lib/actas-aprobacion";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const actaParam = searchParams.get("acta");
  const integranteParam = searchParams.get("integrante");
  const docParam = searchParams.get("doc");
  const firmaParam = searchParams.get("firma");

  const actaId = actaParam ? parseInt(actaParam, 10) : NaN;
  const integranteId = integranteParam ? parseInt(integranteParam, 10) : NaN;
  const docId = docParam ? parseInt(docParam, 10) : NaN;

  if (
    Number.isNaN(actaId) ||
    Number.isNaN(integranteId) ||
    Number.isNaN(docId) ||
    !firmaParam?.trim()
  ) {
    return NextResponse.json({ error: "Enlace inválido" }, { status: 400 });
  }

  if (!verificarFirmaDescargaDocumento(actaId, integranteId, docId, firmaParam.trim())) {
    return NextResponse.json({ error: "Enlace inválido o expirado" }, { status: 403 });
  }

  const [acta] = await db
    .select({ estado: actasReunion.estado })
    .from(actasReunion)
    .where(eq(actasReunion.id, actaId));
  if (!acta || acta.estado !== "enviada") {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }

  const [integrante] = await db
    .select({ id: actasIntegrantes.id })
    .from(actasIntegrantes)
    .where(
      and(
        eq(actasIntegrantes.actaId, actaId),
        eq(actasIntegrantes.id, integranteId)
      )
  );
  if (!integrante) {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
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
