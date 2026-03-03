import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ordenComparendo, procesos } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { readProcesoDocument } from "@/lib/uploads";
import { getSession } from "@/lib/auth-server";

type Params = { params: Promise<{ id: string; docId: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, { params }: Params) {
  const { id: procesoIdStr, docId: docIdStr } = await params;
  const procesoId = parseInt(procesoIdStr, 10);
  const docId = parseInt(docIdStr, 10);
  const url = new URL(request.url);
  const forzarDescarga = url.searchParams.get("descargar") === "1";

  if (Number.isNaN(procesoId) || Number.isNaN(docId)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const session = await getSession();
  const [proceso] = await db
    .select({ id: procesos.id, asignadoAId: procesos.asignadoAId })
    .from(procesos)
    .where(eq(procesos.id, procesoId));
  if (!proceso) {
    return NextResponse.json({ error: "Proceso no encontrado" }, { status: 404 });
  }
  const esAdmin = session?.user?.rol === "admin";
  const esAsignado = session?.user?.id != null && proceso.asignadoAId === session.user.id;
  if (!esAdmin && !esAsignado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [orden] = await db
    .select()
    .from(ordenComparendo)
    .where(and(eq(ordenComparendo.id, docId), eq(ordenComparendo.procesoId, procesoId)));

  if (!orden || !orden.rutaArchivo || !orden.nombreOriginal) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  try {
    const buffer = await readProcesoDocument(orden.rutaArchivo);
    const disposition = forzarDescarga
      ? `attachment; filename="${encodeURIComponent(orden.nombreOriginal)}"`
      : `inline; filename="${encodeURIComponent(orden.nombreOriginal)}"`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": orden.mimeType ?? "application/octet-stream",
        "Content-Disposition": disposition,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Error al leer el archivo" }, { status: 500 });
  }
}
