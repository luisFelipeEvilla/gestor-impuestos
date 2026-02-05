import Link from "next/link";
import { crearImpuesto } from "@/lib/actions/impuestos";
import { ImpuestoForm } from "@/components/impuestos/impuesto-form";
import { Button } from "@/components/ui/button";

export default function NuevoImpuestoPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/impuestos">← Impuestos</Link>
        </Button>
      </div>
      <div className="max-w-lg">
        <ImpuestoForm action={crearImpuesto} submitLabel="Crear impuesto" />
      </div>
    </div>
  );
}
