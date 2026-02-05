import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { procesos, impuestos, contribuyentes, usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { actualizarProceso } from "@/lib/actions/procesos";
import { ProcesoForm } from "@/components/procesos/proceso-form";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export default async function EditarProcesoPage({ params }: Props) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [proceso] = await db.select().from(procesos).where(eq(procesos.id, id));
  if (!proceso) notFound();

  const [impuestosList, contribuyentesList, usuariosList] = await Promise.all([
    db.select({ id: impuestos.id, nombre: impuestos.nombre, codigo: impuestos.codigo }).from(impuestos).where(eq(impuestos.activo, true)),
    db.select({ id: contribuyentes.id, nit: contribuyentes.nit, nombreRazonSocial: contribuyentes.nombreRazonSocial }).from(contribuyentes),
    db.select({ id: usuarios.id, nombre: usuarios.nombre }).from(usuarios).where(eq(usuarios.activo, true)),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/procesos/${proceso.id}`}>← Ver proceso</Link>
        </Button>
      </div>
      <div className="max-w-lg">
        <ProcesoForm
          action={actualizarProceso}
          initialData={proceso}
          submitLabel="Guardar cambios"
          impuestos={impuestosList}
          contribuyentes={contribuyentesList}
          usuarios={usuariosList}
        />
      </div>
    </div>
  );
}
