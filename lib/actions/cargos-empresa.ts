"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { cargosEmpresa } from "@/lib/db/schema";
import { asc, eq, max } from "drizzle-orm";
import { requireAdminSession } from "@/lib/auth-server";

export async function listarCargosEmpresa(): Promise<{ id: number; nombre: string }[]> {
  const rows = await db
    .select({ id: cargosEmpresa.id, nombre: cargosEmpresa.nombre })
    .from(cargosEmpresa)
    .orderBy(asc(cargosEmpresa.orden), asc(cargosEmpresa.id));
  return rows;
}

/** Lista cargos con orden (para página de administración). */
export async function listarCargosEmpresaConOrden(): Promise<
  { id: number; nombre: string; orden: number }[]
> {
  const rows = await db
    .select({
      id: cargosEmpresa.id,
      nombre: cargosEmpresa.nombre,
      orden: cargosEmpresa.orden,
    })
    .from(cargosEmpresa)
    .orderBy(asc(cargosEmpresa.orden), asc(cargosEmpresa.id));
  return rows;
}

const schemaCargo = z.object({
  nombre: z.string().min(1, "El nombre del cargo es obligatorio").max(150),
  orden: z.coerce.number().int().min(0).default(0),
});

export type EstadoFormCargo = {
  error?: string;
  errores?: Record<string, string[]>;
};

export async function crearCargoEmpresa(
  _prev: EstadoFormCargo | null,
  formData: FormData
): Promise<EstadoFormCargo> {
  const session = await requireAdminSession();
  if (!session) return { error: "No tienes permiso para realizar esta acción." };

  const raw = {
    nombre: formData.get("nombre"),
    orden: formData.get("orden"),
  };
  const parsed = schemaCargo.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const errores = flat.fieldErrors as Record<string, string[] | undefined>;
    return {
      error: flat.formErrors.join(" ") || "Datos inválidos",
      errores: Object.keys(errores).length ? (errores as Record<string, string[]>) : undefined,
    };
  }

  const { nombre, orden } = parsed.data;
  try {
    const [maxOrden] = await db.select({ value: max(cargosEmpresa.orden) }).from(cargosEmpresa);
    const siguienteOrden = (maxOrden?.value ?? -1) + 1;
    const [inserted] = await db
      .insert(cargosEmpresa)
      .values({
        nombre: nombre.trim(),
        orden: orden > 0 ? orden : siguienteOrden,
      })
      .returning({ id: cargosEmpresa.id });
    if (!inserted) throw new Error("No se pudo crear el cargo");
    revalidatePath("/cargos");
    revalidatePath("/usuarios");
    revalidatePath("/empresa");
    revalidatePath("/actas");
    redirect(`/cargos`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al crear el cargo. Intenta de nuevo." };
  }
}

export async function actualizarCargoEmpresa(
  _prev: EstadoFormCargo | null,
  formData: FormData
): Promise<EstadoFormCargo> {
  const session = await requireAdminSession();
  if (!session) return { error: "No tienes permiso para realizar esta acción." };

  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" ? parseInt(idRaw, 10) : Number(idRaw);
  const raw = {
    id: Number.isNaN(id) ? undefined : id,
    nombre: formData.get("nombre"),
    orden: formData.get("orden"),
  };
  const parsed = schemaCargo
    .extend({ id: z.number().int().positive() })
    .safeParse({ id, nombre: raw.nombre, orden: raw.orden });
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const errores = flat.fieldErrors as Record<string, string[] | undefined>;
    return {
      error: flat.formErrors.join(" ") || "Datos inválidos",
      errores: Object.keys(errores).length ? (errores as Record<string, string[]>) : undefined,
    };
  }

  const { id: cargoId, nombre, orden } = parsed.data;
  try {
    const [updated] = await db
      .update(cargosEmpresa)
      .set({ nombre: nombre.trim(), orden })
      .where(eq(cargosEmpresa.id, cargoId))
      .returning({ id: cargosEmpresa.id });
    if (!updated) return { error: "Cargo no encontrado." };
    revalidatePath("/cargos");
    revalidatePath("/usuarios");
    revalidatePath("/empresa");
    revalidatePath("/actas");
    redirect("/cargos");
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al actualizar el cargo. Intenta de nuevo." };
  }
}

export async function eliminarCargoEmpresa(formData: FormData): Promise<EstadoFormCargo> {
  const session = await requireAdminSession();
  if (!session) return { error: "No tienes permiso para realizar esta acción." };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "ID inválido." };
  try {
    const [deleted] = await db
      .delete(cargosEmpresa)
      .where(eq(cargosEmpresa.id, id))
      .returning({ id: cargosEmpresa.id });
    if (!deleted) return { error: "Cargo no encontrado." };
    revalidatePath("/cargos");
    revalidatePath("/usuarios");
    revalidatePath("/empresa");
    revalidatePath("/actas");
    redirect("/cargos");
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string") {
      throw err;
    }
    console.error(err);
    return { error: "Error al eliminar el cargo." };
  }
}
