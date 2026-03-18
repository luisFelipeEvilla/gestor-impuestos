"use server";

import path from "path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  procesos,
  contribuyentes,
  ordenesResolucion,
  vehiculos,
  mandamientosPago,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { MandamientoPagoPdfDocument } from "@/lib/pdf/mandamiento-pago-pdf";
import type { MandamientoPagoData } from "@/lib/pdf/mandamiento-pago-pdf";
import { saveProcesoDocument, getRelativePath, readProcesoDocument, deleteProcesoDocument } from "@/lib/uploads";

const FIRMA_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const FIRMA_MIMES = ["image/png", "image/jpeg", "image/jpg"];

async function queryProcesoData(procesoId: number) {
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
      vehiculoPlaca: vehiculos.placa,
    })
    .from(procesos)
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
    .leftJoin(vehiculos, eq(procesos.vehiculoId, vehiculos.id))
    .where(eq(procesos.id, procesoId));

  if (!row) return null;

  const ordenResolucion = await db
    .select({
      numeroResolucion: ordenesResolucion.numeroResolucion,
      fechaResolucion: ordenesResolucion.fechaResolucion,
      codigoInfraccion: ordenesResolucion.codigoInfraccion,
    })
    .from(ordenesResolucion)
    .where(eq(ordenesResolucion.procesoId, procesoId))
    .then((r) => r[0] ?? null);

  return { row, ordenResolucion };
}

type ProcesoRow = NonNullable<Awaited<ReturnType<typeof queryProcesoData>>>["row"];
type OrdenResolucionRow = NonNullable<Awaited<ReturnType<typeof queryProcesoData>>>["ordenResolucion"];

function buildPdfData(
  row: ProcesoRow,
  ordenResolucion: OrdenResolucionRow,
  proyectorNombre: string | null,
  firmadorNombre: string | null,
  signatureImageBase64?: string | null
): MandamientoPagoData {
  const logoPath = path.join(process.cwd(), "public", "logo_magdalena.png");
  return {
    proyectorNombre,
    firmadorNombre,
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
    },
    ordenResolucion,
    logoPath,
    fechaGeneracion: new Date(),
    signatureImageBase64,
  };
}

export async function generarMandamiento(
  procesoId: number
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session?.user) return { error: "No autorizado" };

  const queryResult = await queryProcesoData(procesoId);
  if (!queryResult) return { error: "Proceso no encontrado" };

  const { row, ordenResolucion } = queryResult;

  // Verificar permisos: admin o asignado al proceso
  if (session.user.rol !== "admin") {
    if (!session.user.id || row.asignadoAId !== session.user.id) {
      return { error: "No autorizado" };
    }
  }

  const data = buildPdfData(row, ordenResolucion, session.user.name ?? null, null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = React.createElement(MandamientoPagoPdfDocument, { data });
  const buffer = await renderToBuffer(doc as React.ReactElement<any>);
  const nombreOriginal = `mandamiento-pago-${procesoId}-${Date.now()}.pdf`;

  const storedFileName = await saveProcesoDocument(
    procesoId,
    Buffer.from(buffer),
    nombreOriginal,
    "application/pdf"
  );

  const rutaArchivo = getRelativePath(procesoId, storedFileName).replace(/\\/g, "/");

  await db.insert(mandamientosPago).values({
    procesoId,
    generadoPorId: session.user.id ?? null,
    rutaArchivo,
    nombreOriginal,
    tamano: buffer.byteLength,
  });

  revalidatePath(`/comparendos/${procesoId}`);
  return {};
}

export async function firmarMandamiento(
  mandamientoId: number,
  formData: FormData
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session?.user) return { error: "No autorizado" };

  const [mandamiento] = await db
    .select()
    .from(mandamientosPago)
    .where(eq(mandamientosPago.id, mandamientoId));

  if (!mandamiento) return { error: "Mandamiento no encontrado" };
  if (mandamiento.firmadoEn) return { error: "El mandamiento ya fue firmado" };

  const queryResult = await queryProcesoData(mandamiento.procesoId);
  if (!queryResult) return { error: "Proceso no encontrado" };

  const { row, ordenResolucion } = queryResult;

  // Verificar permisos: admin, asignado al proceso o usuario_cliente
  const esAdmin = session.user.rol === "admin";
  const esAsignado = !!session.user.id && row.asignadoAId === session.user.id;
  const esUsuarioCliente = session.user.rol === "usuario_cliente";
  if (!esAdmin && !esAsignado && !esUsuarioCliente) {
    return { error: "No autorizado" };
  }

  // Leer imagen de firma
  const firmaFile = formData.get("firma");
  if (!(firmaFile instanceof File)) return { error: "Imagen de firma requerida" };
  if (!FIRMA_MIMES.includes(firmaFile.type)) {
    return { error: "Solo se permiten imágenes PNG o JPG" };
  }
  if (firmaFile.size > FIRMA_MAX_BYTES) {
    return { error: "La imagen no debe superar 2 MB" };
  }

  const firmaBuffer = Buffer.from(await firmaFile.arrayBuffer());
  const signatureImageBase64 = `data:${firmaFile.type};base64,${firmaBuffer.toString("base64")}`;

  const data = buildPdfData(row, ordenResolucion, session.user.name ?? null, session.user.name ?? null, signatureImageBase64);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = React.createElement(MandamientoPagoPdfDocument, { data });
  const buffer = await renderToBuffer(doc as React.ReactElement<any>);

  const nombreOriginal = `mandamiento-pago-firmado-${mandamiento.procesoId}-${Date.now()}.pdf`;
  const storedFileName = await saveProcesoDocument(
    mandamiento.procesoId,
    Buffer.from(buffer),
    nombreOriginal,
    "application/pdf"
  );
  const rutaArchivo = getRelativePath(mandamiento.procesoId, storedFileName).replace(/\\/g, "/");

  await db
    .update(mandamientosPago)
    .set({
      rutaArchivo,
      nombreOriginal,
      tamano: buffer.byteLength,
      firmadoPorId: session.user.id ?? null,
      firmadoEn: new Date(),
    })
    .where(eq(mandamientosPago.id, mandamientoId));

  revalidatePath(`/comparendos/${mandamiento.procesoId}`);
  return {};
}

export async function eliminarMandamiento(
  mandamientoId: number
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session?.user) return { error: "No autorizado" };
  if (session.user.rol !== "admin") return { error: "Solo administradores pueden eliminar mandamientos" };

  const [mandamiento] = await db
    .select()
    .from(mandamientosPago)
    .where(eq(mandamientosPago.id, mandamientoId));

  if (!mandamiento) return { error: "Mandamiento no encontrado" };

  // Eliminar archivo físico (no lanzar si ya no existe)
  try {
    await deleteProcesoDocument(mandamiento.rutaArchivo);
  } catch {
    // El archivo puede haber sido eliminado manualmente; continuamos
  }

  await db.delete(mandamientosPago).where(eq(mandamientosPago.id, mandamientoId));

  revalidatePath(`/comparendos/${mandamiento.procesoId}`);
  return {};
}
