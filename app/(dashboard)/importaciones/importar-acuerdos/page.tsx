import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { ImportarAcuerdosForm } from "@/components/procesos/importar-acuerdos-form";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function ImportarAcuerdosPage() {
  const session = await getSession();
  if (session?.user?.rol !== "admin") {
    redirect("/comparendos");
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/importaciones/acuerdos" className="hover:text-foreground transition-colors">
            Importaciones
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="text-foreground">Importar acuerdos de pago</span>
        </nav>
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Importar acuerdos de pago
          </h1>
        </div>
        <p className="text-muted-foreground">
          Importe acuerdos de pago desde un archivo CSV.
        </p>
      </div>

      <ImportarAcuerdosForm />
    </div>
  );
}
