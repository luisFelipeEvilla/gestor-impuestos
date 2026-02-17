import Link from "next/link";
import { db } from "@/lib/db";
import { usuarios, clientes, cargosEmpresa } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { crearActa } from "@/lib/actions/actas";
import { obtenerObligacionesConActividades } from "@/lib/actions/actividades";
import { obtenerMiembrosPorClientes } from "@/lib/actions/clientes-miembros";
import { listarCargosEmpresa } from "@/lib/actions/cargos-empresa";
import { ActaForm } from "@/components/actas/acta-form";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default async function NuevaActaPage() {
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
      .where(eq(usuarios.activo, true)),
    db
      .select({ id: clientes.id, nombre: clientes.nombre, codigo: clientes.codigo })
      .from(clientes)
      .where(eq(clientes.activo, true))
      .orderBy(clientes.nombre),
    listarCargosEmpresa(),
    obtenerObligacionesConActividades(),
  ]);

  const clientesMiembrosList =
    clientesList.length > 0
      ? await obtenerMiembrosPorClientes(clientesList.map((c) => c.id))
      : [];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/actas">← Actas</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-4xl">
        <ActaForm
          action={crearActa}
          submitLabel="Crear acta"
          usuarios={usuariosList}
          clientes={clientesList}
          obligacionesConActividades={obligacionesConActividades}
          cargosEmpresa={cargosEmpresaList}
          clientesMiembros={clientesMiembrosList}
        />
      </div>
    </div>
  );
}
