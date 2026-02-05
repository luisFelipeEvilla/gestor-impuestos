import Link from "next/link";
import { crearContribuyente } from "@/lib/actions/contribuyentes";
import { ContribuyenteForm } from "@/components/contribuyentes/contribuyente-form";
import { Button } from "@/components/ui/button";

export default function NuevoContribuyentePage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/contribuyentes">← Contribuyentes</Link>
        </Button>
      </div>
      <div className="max-w-lg">
        <ContribuyenteForm action={crearContribuyente} submitLabel="Crear contribuyente" />
      </div>
    </div>
  );
}
