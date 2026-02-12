import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { actasReunion, aprobacionesActaParticipante } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { readAprobacionFoto } from "@/lib/uploads";

type Params = { params: Promise<{ id: string; integranteId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: actaIdStr, integranteId: integranteIdStr } = await params;
  const actaId = parseInt(actaIdStr, 10);
  const integranteId = parseInt(integranteIdStr, 10);

  if (Number.isNaN(actaId) || Number.isNaN(integranteId)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const [acta] = await db
    .select({ creadoPorId: actasReunion.creadoPorId })
    .from(actasReunion)
    .where(eq(actasReunion.id, actaId));
  if (!acta) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const isAdmin = session.user.rol === "admin";
  const isCreador = acta.creadoPorId === session.user.id;
  if (!isAdmin && !isCreador) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [aprobacion] = await db
    .select({ rutaFoto: aprobacionesActaParticipante.rutaFoto })
    .from(aprobacionesActaParticipante)
    .where(
      and(
        eq(aprobacionesActaParticipante.actaId, actaId),
        eq(aprobacionesActaParticipante.actaIntegranteId, integranteId)
      )
    );

  if (!aprobacion?.rutaFoto?.trim()) {
    return NextResponse.json({ error: "Sin foto" }, { status: 404 });
  }

  try {
    const buffer = await readAprobacionFoto(aprobacion.rutaFoto);
    const ext = aprobacion.rutaFoto.split(".").pop()?.toLowerCase() ?? "jpg";
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Error al leer la imagen" },
      { status: 500 }
    );
  }
}
