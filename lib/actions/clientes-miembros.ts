"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clientesMiembros } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";

export type ClienteMiembroItem = {
  id: number;
  nombre: string;
  email: string;
  cargo: string | null;
  activo: boolean;
};

export async function obtenerMiembrosPorCliente(
  clienteId: number
): Promise<ClienteMiembroItem[]> {
  const session = await getSession();
  if (!session?.user) return [];

  const rows = await db
    .select({
      id: clientesMiembros.id,
      nombre: clientesMiembros.nombre,
      email: clientesMiembros.email,
      cargo: clientesMiembros.cargo,
      activo: clientesMiembros.activo,
    })
    .from(clientesMiembros)
    .where(eq(clientesMiembros.clienteId, clienteId))
    .orderBy(clientesMiembros.nombre);

  return rows;
}

/** Miembros activos de varios clientes (para asignar compromisos en actas). */
export async function obtenerMiembrosPorClientes(
  clienteIds: number[]
): Promise<{ id: number; clienteId: number; nombre: string; email: string; cargo: string | null }[]> {
  const session = await getSession();
  if (!session?.user || clienteIds.length === 0) return [];

  const rows = await db
    .select({
      id: clientesMiembros.id,
      clienteId: clientesMiembros.clienteId,
      nombre: clientesMiembros.nombre,
      email: clientesMiembros.email,
      cargo: clientesMiembros.cargo,
    })
    .from(clientesMiembros)
    .where(
      and(
        inArray(clientesMiembros.clienteId, clienteIds),
        eq(clientesMiembros.activo, true)
      )
    )
    .orderBy(clientesMiembros.nombre);

  return rows;
}

export async function crearMiembroCliente(
  clienteId: number,
  formData: FormData
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session?.user) return { error: "No autorizado." };

  const nombre = (formData.get("nombre") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const cargo = (formData.get("cargo") as string)?.trim() || null;

  if (!nombre || !email) return { error: "Nombre y correo son obligatorios." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Correo no válido." };

  try {
    await db.insert(clientesMiembros).values({
      clienteId,
      nombre,
      email,
      cargo: cargo || null,
      activo: true,
    });
    revalidatePath(`/clientes/${clienteId}`);
    revalidatePath("/actas");
    return {};
  } catch (err) {
    console.error(err);
    return { error: "Error al crear el miembro." };
  }
}

export async function actualizarMiembroCliente(
  id: number,
  clienteId: number,
  formData: FormData
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session?.user) return { error: "No autorizado." };

  const nombre = (formData.get("nombre") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const cargo = (formData.get("cargo") as string)?.trim() || null;
  const activo = formData.get("activo") === "on";

  if (!nombre || !email) return { error: "Nombre y correo son obligatorios." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Correo no válido." };

  try {
    await db
      .update(clientesMiembros)
      .set({ nombre, email, cargo: cargo || null, activo, updatedAt: new Date() })
      .where(eq(clientesMiembros.id, id));
    revalidatePath(`/clientes/${clienteId}`);
    revalidatePath("/actas");
    return {};
  } catch (err) {
    console.error(err);
    return { error: "Error al actualizar el miembro." };
  }
}

export async function eliminarMiembroCliente(
  id: number,
  clienteId: number
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session?.user) return { error: "No autorizado." };

  try {
    await db.delete(clientesMiembros).where(eq(clientesMiembros.id, id));
    revalidatePath(`/clientes/${clienteId}`);
    revalidatePath("/actas");
    return {};
  } catch (err) {
    console.error(err);
    return { error: "Error al eliminar el miembro." };
  }
}
