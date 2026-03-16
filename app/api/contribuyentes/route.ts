import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contribuyentes } from "@/lib/db/schema";
import { count, ilike, or, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));
  const offset = (page - 1) * limit;

  const where = q
    ? or(
        ilike(contribuyentes.nombreRazonSocial, `%${q}%`),
        ilike(contribuyentes.nit, `%${q}%`)
      )
    : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(contribuyentes)
    .where(where);

  const data = await db
    .select({
      id: contribuyentes.id,
      nit: contribuyentes.nit,
      nombreRazonSocial: contribuyentes.nombreRazonSocial,
    })
    .from(contribuyentes)
    .where(where)
    .orderBy(sql`${contribuyentes.nombreRazonSocial} asc`)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ data, total, page, limit });
}
