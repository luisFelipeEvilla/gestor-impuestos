"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { vehiculos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type EstadoFormVehiculo = {
  error?: string;
  errores?: Record<string, string[]>;
};

const schemaVehiculo = z.object({
  contribuyenteId: z.coerce.number().int().positive("Selecciona un contribuyente"),
  placa: z
    .string()
    .min(1, "La placa es obligatoria")
    .max(20)
    .transform((v) => v.toUpperCase().trim()),
  modelo: z.coerce
    .number()
    .int()
    .min(1900)
    .max(2100)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? null : Number(v))),
  clase: z.string().max(100).optional().or(z.literal("")).transform((v) => v || null),
  marca: z.string().max(100).optional().or(z.literal("")).transform((v) => v || null),
  linea: z.string().max(200).optional().or(z.literal("")).transform((v) => v || null),
  cilindraje: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? null : Number(v))),
});

const schemaActualizar = schemaVehiculo.extend({
  id: z.coerce.number().int().positive("ID inválido"),
});

function isRedirectError(err: unknown): boolean {
  return (
    err != null &&
    typeof err === "object" &&
    "digest" in err &&
    typeof (err as { digest?: string }).digest === "string"
  );
}

function rawFromForm(formData: FormData) {
  return {
    contribuyenteId: formData.get("contribuyenteId"),
    placa: formData.get("placa"),
    modelo: formData.get("modelo") || undefined,
    clase: formData.get("clase") || undefined,
    marca: formData.get("marca") || undefined,
    linea: formData.get("linea") || undefined,
    cilindraje: formData.get("cilindraje") || undefined,
  };
}

export async function crearVehiculo(
  _prev: EstadoFormVehiculo | null,
  formData: FormData
): Promise<EstadoFormVehiculo> {
  const parsed = schemaVehiculo.safeParse(rawFromForm(formData));
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      error: flat.formErrors.join(" ") || "Datos inválidos",
      errores: flat.fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const [inserted] = await db
      .insert(vehiculos)
      .values(parsed.data as typeof vehiculos.$inferInsert)
      .returning({ id: vehiculos.id });

    if (!inserted) throw new Error("No se pudo crear el vehículo");
    revalidatePath("/vehiculos");
    redirect(`/vehiculos/${inserted.id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("vehiculos_placa_unique") || msg.includes("unique")) {
      return { error: "Ya existe un vehículo con esa placa." };
    }
    console.error(err);
    return { error: "Error al crear el vehículo. Intenta de nuevo." };
  }
}

export async function actualizarVehiculo(
  _prev: EstadoFormVehiculo | null,
  formData: FormData
): Promise<EstadoFormVehiculo> {
  const idRaw = formData.get("id");
  const parsed = schemaActualizar.safeParse({ id: idRaw, ...rawFromForm(formData) });
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      error: flat.formErrors.join(" ") || "Datos inválidos",
      errores: flat.fieldErrors as Record<string, string[]>,
    };
  }

  const { id, ...values } = parsed.data;

  try {
    const [updated] = await db
      .update(vehiculos)
      .set({ ...(values as Partial<typeof vehiculos.$inferInsert>), actualizadoEn: new Date() })
      .where(eq(vehiculos.id, id))
      .returning({ id: vehiculos.id });

    if (!updated) return { error: "Vehículo no encontrado." };
    revalidatePath("/vehiculos");
    revalidatePath(`/vehiculos/${id}`);
    redirect(`/vehiculos/${id}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("vehiculos_placa_unique") || msg.includes("unique")) {
      return { error: "Ya existe un vehículo con esa placa." };
    }
    console.error(err);
    return { error: "Error al actualizar el vehículo. Intenta de nuevo." };
  }
}

export async function eliminarVehiculo(formData: FormData): Promise<EstadoFormVehiculo> {
  const id = parseInt(String(formData.get("id") ?? ""), 10);
  if (Number.isNaN(id) || id <= 0) return { error: "ID inválido." };

  try {
    const [deleted] = await db
      .delete(vehiculos)
      .where(eq(vehiculos.id, id))
      .returning({ id: vehiculos.id });

    if (!deleted) return { error: "Vehículo no encontrado." };
    revalidatePath("/vehiculos");
    redirect("/vehiculos");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    if (
      err != null &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "23503"
    ) {
      return { error: "No se puede eliminar: el vehículo tiene impuestos asociados." };
    }
    console.error(err);
    return { error: "Error al eliminar el vehículo." };
  }
}
