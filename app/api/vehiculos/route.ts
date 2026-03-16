import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehiculos } from "@/lib/db/schema";
import { count, eq, ilike, and } from "drizzle-orm";
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
  const contribuyenteIdRaw = searchParams.get("contribuyenteId");
  const contribuyenteId = contribuyenteIdRaw ? parseInt(contribuyenteIdRaw, 10) : null;
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));
  const offset = (page - 1) * limit;

  // contribuyenteId es opcional: si se provee, filtra por propietario actual;
  // si no se provee, busca en todos los vehículos (para comparendos históricos).
  const contribuyenteCond = contribuyenteId && !isNaN(contribuyenteId)
    ? eq(vehiculos.contribuyenteId, contribuyenteId)
    : undefined;
  const placaCond = q ? ilike(vehiculos.placa, `%${q}%`) : undefined;
  const where = contribuyenteCond && placaCond
    ? and(contribuyenteCond, placaCond)
    : contribuyenteCond ?? placaCond;

  const [{ total }] = await db
    .select({ total: count() })
    .from(vehiculos)
    .where(where);

  const data = await db
    .select({
      id: vehiculos.id,
      placa: vehiculos.placa,
    })
    .from(vehiculos)
    .where(where)
    .orderBy(vehiculos.placa)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ data, total, page, limit });
}
