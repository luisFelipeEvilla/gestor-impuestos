import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * GET /api/health
 * Comprueba que la app y la conexión a la base de datos respondan.
 * Útil para Vercel health checks y monitoreo.
 */
export async function GET(): Promise<NextResponse> {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json(
      { status: "ok", database: "connected" },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", database: "disconnected", error: message },
      { status: 503 }
    );
  }
}
