import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandamientosPago } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { readProcesoDocument } from "@/lib/uploads";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; mandamientoId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { mandamientoId: mandamientoIdStr } = await context.params;
  const mandamientoId = parseInt(mandamientoIdStr, 10);
  if (isNaN(mandamientoId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const [mandamiento] = await db
    .select()
    .from(mandamientosPago)
    .where(eq(mandamientosPago.id, mandamientoId));

  if (!mandamiento) {
    return NextResponse.json({ error: "Mandamiento no encontrado" }, { status: 404 });
  }

  const fileBuffer = await readProcesoDocument(mandamiento.rutaArchivo);
  const filename = mandamiento.nombreOriginal;

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=0",
    },
  });
}
