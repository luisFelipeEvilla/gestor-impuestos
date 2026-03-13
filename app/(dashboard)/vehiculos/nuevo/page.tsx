import Link from "next/link";
import { Button } from "@/components/ui/button";
import { crearVehiculo } from "@/lib/actions/vehiculos";
import { VehiculoForm } from "@/components/vehiculos/vehiculo-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function NuevoVehiculoPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/vehiculos">← Vehículos</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-2xl">
        <VehiculoForm action={crearVehiculo} submitLabel="Crear vehículo" />
      </div>
    </div>
  );
}
