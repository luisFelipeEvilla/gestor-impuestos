import Link from "next/link";
import { Button } from "@/components/ui/button";
import { crearCargoEmpresa } from "@/lib/actions/cargos-empresa";
import { CargoForm } from "@/components/cargos/cargo-form";

export default function NuevoCargoPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/cargos">← Cargos</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-2xl">
        <CargoForm
          action={crearCargoEmpresa}
          submitLabel="Crear cargo"
        />
      </div>
    </div>
  );
}
