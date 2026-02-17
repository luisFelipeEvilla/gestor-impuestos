import Link from "next/link";
import { db } from "@/lib/db";
import { impuestos, contribuyentes, usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { crearProceso } from "@/lib/actions/procesos";
import { ProcesoForm } from "@/components/procesos/proceso-form";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default async function NuevoProcesoPage() {
  const [impuestosList, contribuyentesList, usuariosList] = await Promise.all([
    db.select({ id: impuestos.id, nombre: impuestos.nombre }).from(impuestos).where(eq(impuestos.activo, true)),
    db.select({ id: contribuyentes.id, nit: contribuyentes.nit, nombreRazonSocial: contribuyentes.nombreRazonSocial }).from(contribuyentes),
    db.select({ id: usuarios.id, nombre: usuarios.nombre }).from(usuarios).where(eq(usuarios.activo, true)),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/procesos">← Procesos</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-3xl">
        <ProcesoForm
          action={crearProceso}
          submitLabel="Crear proceso"
          impuestos={impuestosList}
          contribuyentes={contribuyentesList}
          usuarios={usuariosList}
        />
      </div>
    </div>
  );
}
