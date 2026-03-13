import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { impuestos, contribuyentes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { actualizarImpuesto } from "@/lib/actions/impuestos";
import { ImpuestoForm } from "@/components/impuestos/impuesto-form";
import { Button } from "@/components/ui/button";
import { unstable_noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export default async function EditarImpuestoPage({ params }: Props) {
  unstable_noStore();
  const { id } = await params;
  const idTrim = id?.trim();
  if (!idTrim || idTrim.length < 30) notFound();

  const [impuesto] = await db
    .select()
    .from(impuestos)
    .where(eq(impuestos.id, idTrim));
  if (!impuesto) notFound();

  const contribuyentesList = await db
    .select({
      id: contribuyentes.id,
      nit: contribuyentes.nit,
      nombreRazonSocial: contribuyentes.nombreRazonSocial,
    })
    .from(contribuyentes)
    .orderBy(contribuyentes.nombreRazonSocial);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/impuestos/${impuesto.id}`}>← Ver impuesto</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-2xl">
        <ImpuestoForm
          action={actualizarImpuesto}
          initialData={impuesto}
          submitLabel="Guardar cambios"
          contribuyentes={contribuyentesList}
        />
      </div>
    </div>
  );
}
