import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { vehiculos, contribuyentes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { actualizarVehiculo } from "@/lib/actions/vehiculos";
import { VehiculoForm } from "@/components/vehiculos/vehiculo-form";
import { unstable_noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export default async function EditarVehiculoPage({ params }: Props) {
  unstable_noStore();
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [row] = await db
    .select({
      vehiculo: vehiculos,
      contribuyente: {
        id: contribuyentes.id,
        nit: contribuyentes.nit,
        nombreRazonSocial: contribuyentes.nombreRazonSocial,
      },
    })
    .from(vehiculos)
    .leftJoin(contribuyentes, eq(vehiculos.contribuyenteId, contribuyentes.id))
    .where(eq(vehiculos.id, id));

  if (!row) notFound();

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/vehiculos/${id}`}>← Vehículo {row.vehiculo.placa}</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-2xl">
        <VehiculoForm
          action={actualizarVehiculo}
          initialData={row.vehiculo}
          submitLabel="Guardar cambios"
          contribuyenteActual={row.contribuyente}
        />
      </div>
    </div>
  );
}
