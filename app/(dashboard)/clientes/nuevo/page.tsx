import Link from "next/link";
import { crearCliente } from "@/lib/actions/clientes";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { Button } from "@/components/ui/button";

export default function NuevoClientePage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/clientes">← Clientes</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-2xl">
        <ClienteForm action={crearCliente} submitLabel="Crear cliente" />
      </div>
    </div>
  );
}
