import Link from "next/link";
import { db } from "@/lib/db";
import { contribuyentes } from "@/lib/db/schema";
import { crearImpuesto } from "@/lib/actions/impuestos";
import { ImpuestoForm } from "@/components/impuestos/impuesto-form";
import { Button } from "@/components/ui/button";
import { unstable_noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NuevoImpuestoPage() {
  unstable_noStore();
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
          <Link href="/impuestos">← Impuestos</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-2xl">
        <ImpuestoForm
          action={crearImpuesto}
          submitLabel="Crear impuesto"
          contribuyentes={contribuyentesList}
        />
      </div>
    </div>
  );
}
