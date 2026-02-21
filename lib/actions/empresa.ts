"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TIPO_DOCUMENTO_VALUES_ZOD, type TipoDocumento } from "@/lib/constants/tipo-documento";
import { db } from "@/lib/db";
import { empresa } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const schemaEmpresa = z.object({
  nombre: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(z.string().min(1, "El nombre es obligatorio").max(300)),
  tipoDocumento: z.enum(TIPO_DOCUMENTO_VALUES_ZOD, {
    message: "Selecciona un tipo de documento.",
  }),
  numeroDocumento: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(z.string().min(1, "El número de documento es obligatorio").max(100)),
  direccion: z.string().max(800).optional().or(z.literal("")),
  telefonoContacto: z.string().max(150).optional().or(z.literal("")),
  numeroContacto: z.string().max(150).optional().or(z.literal("")),
  cargoFirmanteActas: z.string().max(150).optional().or(z.literal("")),
});

const schemaConId = schemaEmpresa.extend({
  id: z.number().int().positive().optional(),
});

export type EstadoFormEmpresa = {
  error?: string;
  errores?: Record<string, string[]>;
};

function isConnectionError(err: unknown): boolean {
  const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
  const cause = err && typeof err === "object" && "cause" in err ? (err as { cause?: unknown }).cause : undefined;
  if (code === "ECONNRESET" || code === "ECONNREFUSED" || code === "ETIMEDOUT") return true;
  if (cause && typeof cause === "object" && "code" in cause) {
    return (cause as { code: string }).code === "ECONNRESET";
  }
  return false;
}

export async function getEmpresa(): Promise<{
  id: number;
  nombre: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  direccion: string | null;
  telefonoContacto: string | null;
  numeroContacto: string | null;
  cargoFirmanteActas: string | null;
} | null> {
  const run = async () => {
    const [row] = await db.select().from(empresa).limit(1);
    return row ?? null;
  };
  try {
    const row = await run();
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
  } catch (err) {
    if (isConnectionError(err)) {
      await new Promise((r) => setTimeout(r, 300));
      const row = await run();
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
    throw err;
  }
}

export async function actualizarEmpresa(
  _prev: EstadoFormEmpresa | null,
  formData: FormData
): Promise<EstadoFormEmpresa> {
  const idRaw = formData.get("id");
  const id =
    idRaw == null || idRaw === ""
      ? undefined
      : typeof idRaw === "string"
        ? parseInt(idRaw, 10)
        : Number(idRaw);
  const raw = {
    id: id != null && !Number.isNaN(id) && id > 0 ? id : undefined,
    nombre: (formData.get("nombre") ?? "") as string,
    tipoDocumento: (formData.get("tipoDocumento") ?? "nit") as string,
    numeroDocumento: (formData.get("numeroDocumento") ?? "") as string,
    direccion: (formData.get("direccion") ?? "") as string,
    telefonoContacto: (formData.get("telefonoContacto") ?? "") as string,
    numeroContacto: (formData.get("numeroContacto") ?? "") as string,
    cargoFirmanteActas: (formData.get("cargoFirmanteActas") ?? "") as string,
  };

  const parsed = schemaConId.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const errores = flat.fieldErrors as Record<string, string[] | undefined>;
    const erroresFiltrados =
      Object.keys(errores).length > 0
        ? (Object.fromEntries(
            Object.entries(errores).filter(
              (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0
            )
          ) as Record<string, string[]>)
        : undefined;
    const mensajeGeneral =
      erroresFiltrados && Object.keys(erroresFiltrados).length > 0
        ? "Revisa los campos marcados abajo."
        : flat.formErrors.join(" ") || "Revisa los datos del formulario.";
    return {
      error: mensajeGeneral,
      errores: erroresFiltrados,
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
