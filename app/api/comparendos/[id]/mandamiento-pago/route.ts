import { NextResponse } from "next/server";
import path from "path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { procesos, contribuyentes, ordenesResolucion, vehiculos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { MandamientoPagoPdfDocument } from "@/lib/pdf/mandamiento-pago-pdf";
import type { MandamientoPagoData } from "@/lib/pdf/mandamiento-pago-pdf";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: idStr } = await context.params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const [row] = await db
    .select({
      id: procesos.id,
      noComparendo: procesos.noComparendo,
      montoCop: procesos.montoCop,
      montoMultaCop: procesos.montoMultaCop,
      vigencia: procesos.vigencia,
      periodo: procesos.periodo,
      fechaAplicacionImpuesto: procesos.fechaAplicacionImpuesto,
      asignadoAId: procesos.asignadoAId,
      contribuyenteNombre: contribuyentes.nombreRazonSocial,
      contribuyenteNit: contribuyentes.nit,
      contribuyenteTipoDoc: contribuyentes.tipoDocumento,
      contribuyenteDireccion: contribuyentes.direccion,
      contribuyenteEmail: contribuyentes.email,
      contribuyenteCiudad: contribuyentes.ciudad,
      contribuyenteDepartamento: contribuyentes.departamento,
      vehiculoPlaca: vehiculos.placa,
    })
    .from(procesos)
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
    .leftJoin(vehiculos, eq(procesos.vehiculoId, vehiculos.id))
    .where(eq(procesos.id, id));

  if (!row) {
    return NextResponse.json({ error: "Proceso no encontrado" }, { status: 404 });
  }

  // Employees can only access their own assigned processes
  if (session.user.rol !== "admin") {
    if (!session.user.id || row.asignadoAId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  const ordenResolucion = await db
    .select({
      numeroResolucion: ordenesResolucion.numeroResolucion,
      fechaResolucion: ordenesResolucion.fechaResolucion,
      codigoInfraccion: ordenesResolucion.codigoInfraccion,
    })
    .from(ordenesResolucion)
    .where(eq(ordenesResolucion.procesoId, id))
    .then((r) => r[0] ?? null);

  const logoPath = path.join(process.cwd(), "public", "logo_magdalena.png");

  const data: MandamientoPagoData = {
    proyectorNombre: session.user.name ?? null,
    firmadorNombre: null,
    numeroResolucionEncabezado: `400.03.81-${new Date().getFullYear()}{{consecutivo}}`,
    proceso: {
      id: row.id,
      noComparendo: row.noComparendo,
      montoCop: row.montoCop,
      montoMultaCop: row.montoMultaCop,
      vigencia: row.vigencia,
      periodo: row.periodo,
      fechaAplicacionImpuesto: row.fechaAplicacionImpuesto,
      vehiculoPlaca: row.vehiculoPlaca ?? null,
    },
    contribuyente: {
      nombreRazonSocial: row.contribuyenteNombre,
      nit: row.contribuyenteNit,
      tipoDocumento: row.contribuyenteTipoDoc,
      direccion: row.contribuyenteDireccion,
      email: row.contribuyenteEmail,
      ciudad: row.contribuyenteCiudad,
      departamento: row.contribuyenteDepartamento,
    },
    ordenResolucion,
    logoPath,
    fechaGeneracion: new Date(),
    fechaFirma: null,
  };

  const doc = React.createElement(MandamientoPagoPdfDocument, { data });
  const buffer = await renderToBuffer(doc as React.ReactElement<any>);

  const filename = `mandamiento-pago-${row.id}${row.noComparendo ? `-${row.noComparendo}` : ""}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=0",
    },
  });
}
