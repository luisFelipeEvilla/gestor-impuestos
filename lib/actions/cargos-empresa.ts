"use server";

import { db } from "@/lib/db";
import { cargosEmpresa } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function listarCargosEmpresa(): Promise<{ id: number; nombre: string }[]> {
  const rows = await db
    .select({ id: cargosEmpresa.id, nombre: cargosEmpresa.nombre })
    .from(cargosEmpresa)
    .orderBy(asc(cargosEmpresa.orden), asc(cargosEmpresa.id));
  return rows;
}
