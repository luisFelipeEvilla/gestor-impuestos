import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usuarios, clientes, cargosEmpresa } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { obtenerObligacionesConActividades } from "@/lib/actions/actividades";
import { obtenerMiembrosPorClientes } from "@/lib/actions/clientes-miembros";
import { listarCargosEmpresa } from "@/lib/actions/cargos-empresa";
import { getSession } from "@/lib/auth-server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [usuariosList, clientesList, cargosEmpresaList, obligacionesConActividades] = await Promise.all([
      db
        .select({
          id: usuarios.id,
          nombre: usuarios.nombre,
          email: usuarios.email,
          cargoNombre: cargosEmpresa.nombre,
        })
        .from(usuarios)
        .leftJoin(cargosEmpresa, eq(usuarios.cargoId, cargosEmpresa.id))
        .where(eq(usuarios.activo, true))
        .orderBy(asc(usuarios.nombre)),
      db
        .select({ id: clientes.id, nombre: clientes.nombre, codigo: clientes.codigo })
        .from(clientes)
        .where(eq(clientes.activo, true))
        .orderBy(asc(clientes.nombre)),
      listarCargosEmpresa(),
      obtenerObligacionesConActividades(),
    ]);

    const clientesMiembrosList =
      clientesList.length > 0
        ? await obtenerMiembrosPorClientes(clientesList.map((c) => c.id))
        : [];

    return NextResponse.json({
      usuarios: usuariosList,
      clientes: clientesList,
      cargosEmpresa: cargosEmpresaList,
      obligacionesConActividades,
      clientesMiembros: clientesMiembrosList,
    });
  } catch (error) {
    console.error("Error fetching acta nuevo data:", error);
    return NextResponse.json(
      { error: "Error al obtener los datos" },
      { status: 500 }
    );
  }
}
