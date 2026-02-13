"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { empresa } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const schemaEmpresa = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(200),
  tipoDocumento: z.enum(["nit", "cedula"]),
  numeroDocumento: z.string().min(1, "El número de documento es obligatorio").max(50),
  direccion: z.string().max(500).optional().or(z.literal("")),
  telefonoContacto: z.string().max(50).optional().or(z.literal("")),
  numeroContacto: z.string().max(50).optional().or(z.literal("")),
  cargoFirmanteActas: z.string().max(100).optional().or(z.literal("")),
});

const schemaConId = schemaEmpresa.extend({
  id: z.number().int().positive().optional(),
});

export type EstadoFormEmpresa = {
  error?: string;
  errores?: Record<string, string[]>;
};

export async function getEmpresa(): Promise<{
  id: number;
  nombre: string;
  tipoDocumento: "nit" | "cedula";
  numeroDocumento: string;
  direccion: string | null;
  telefonoContacto: string | null;
  numeroContacto: string | null;
  cargoFirmanteActas: string | null;
} | null> {
  const [row] = await db.select().from(empresa).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    tipoDocumento: row.tipoDocumento,
    numeroDocumento: row.numeroDocumento,
    direccion: row.direccion,
    telefonoContacto: row.telefonoContacto,
    numeroContacto: row.numeroContacto,
    cargoFirmanteActas: row.cargoFirmanteActas,
  };
}

export async function actualizarEmpresa(
  _prev: EstadoFormEmpresa | null,
  formData: FormData
): Promise<EstadoFormEmpresa> {
  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" ? parseInt(idRaw, 10) : Number(idRaw);
  const raw = {
    id: Number.isNaN(id) ? undefined : id,
    nombre: formData.get("nombre"),
    tipoDocumento: formData.get("tipoDocumento"),
    numeroDocumento: formData.get("numeroDocumento"),
    direccion: formData.get("direccion") ?? "",
    telefonoContacto: formData.get("telefonoContacto") ?? "",
    numeroContacto: formData.get("numeroContacto") ?? "",
    cargoFirmanteActas: formData.get("cargoFirmanteActas") ?? "",
  };

  const parsed = schemaConId.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const errores = flat.fieldErrors as Record<string, string[] | undefined>;
    return {
      error: flat.formErrors.join(" ") || "Datos inválidos",
      errores: Object.keys(errores).length ? (errores as Record<string, string[]>) : undefined,
    };
  }

  const {
    id: empresaId,
    nombre,
    tipoDocumento,
    numeroDocumento,
    direccion,
    telefonoContacto,
    numeroContacto,
    cargoFirmanteActas,
  } = parsed.data;

  try {
    if (empresaId != null) {
      const [existing] = await db.select().from(empresa).where(eq(empresa.id, empresaId)).limit(1);
      if (existing) {
        await db
          .update(empresa)
          .set({
            nombre: nombre.trim(),
            tipoDocumento,
            numeroDocumento: numeroDocumento.trim(),
            direccion: direccion?.trim() || null,
            telefonoContacto: telefonoContacto?.trim() || null,
            numeroContacto: numeroContacto?.trim() || null,
            cargoFirmanteActas: cargoFirmanteActas?.trim() || null,
            updatedAt: new Date(),
          })
          .where(eq(empresa.id, empresaId));
        revalidatePath("/empresa");
        return {};
      }
    }
    await db.insert(empresa).values({
      nombre: nombre.trim(),
      tipoDocumento,
      numeroDocumento: numeroDocumento.trim(),
      direccion: direccion?.trim() || null,
      telefonoContacto: telefonoContacto?.trim() || null,
      numeroContacto: numeroContacto?.trim() || null,
      cargoFirmanteActas: cargoFirmanteActas?.trim() || null,
    });
    revalidatePath("/empresa");
    return {};
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string"
    ) {
      throw err;
    }
    console.error(err);
    return { error: "Error al guardar los datos de la empresa. Intenta de nuevo." };
  }
}
