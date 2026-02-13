import { NextResponse } from "next/server";
import path from "path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { obtenerActaPorId } from "@/lib/actions/actas";
import { getEmpresa } from "@/lib/actions/empresa";
import { ActaPdfDocument } from "@/lib/pdf/acta-pdf-document";
import { getSession } from "@/lib/auth-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const actaId = parseInt(id, 10);
  if (Number.isNaN(actaId)) {
    return NextResponse.json({ error: "ID de acta inválido" }, { status: 400 });
  }

  const [acta, empresa] = await Promise.all([
    obtenerActaPorId(actaId),
    getEmpresa(),
  ]);

  if (!acta) {
    return NextResponse.json({ error: "Acta no encontrada" }, { status: 404 });
  }

  const logoPath = path.join(process.cwd(), "public", "logo_rr.png");

  const doc = React.createElement(ActaPdfDocument, {
    acta,
    empresa,
    logoPath,
  });

  const buffer = await renderToBuffer(doc);

  const filename = `acta-${actaId}-${new Date(acta.fecha).toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=0",
    },
  });
}
