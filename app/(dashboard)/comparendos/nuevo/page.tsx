import Link from "next/link";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { crearProceso } from "@/lib/actions/procesos";
import { ProcesoForm } from "@/components/procesos/proceso-form";
import { Button } from "@/components/ui/button";
import { unstable_noStore } from "next/cache";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function NuevoProcesoPage() {
  unstable_noStore();
  const usuariosList = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre })
    .from(usuarios)
    .where(eq(usuarios.activo, true));

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/comparendos">← Procesos</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-3xl">
        <ProcesoForm
          action={crearProceso}
          submitLabel="Crear proceso"
          usuarios={usuariosList}
        />
      </div>
    </div>
  );
}
