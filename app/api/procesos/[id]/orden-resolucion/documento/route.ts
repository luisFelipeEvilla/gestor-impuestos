import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ordenesResolucion } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { readProcesoDocument } from "@/lib/uploads";
import { getSession } from "@/lib/auth-server";
import { procesos } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: Params) {
  const { id: procesoIdStr } = await params;
  const procesoId = parseInt(procesoIdStr, 10);

  if (Number.isNaN(procesoId)) {
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
    .from(ordenesResolucion)
    .where(eq(ordenesResolucion.procesoId, procesoId));

  if (!orden || !orden.rutaArchivo || !orden.nombreOriginal) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  try {
    const buffer = await readProcesoDocument(orden.rutaArchivo);
    const disposition = `inline; filename="${encodeURIComponent(orden.nombreOriginal)}"`;
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
