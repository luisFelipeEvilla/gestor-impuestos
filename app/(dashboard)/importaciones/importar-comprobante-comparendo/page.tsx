import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { ImportarComparendosForm } from "@/components/procesos/importar-comparendos-form";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function ImportarComparendosPage() {
  const session = await getSession();
  if (session?.user?.rol !== "admin") {
    redirect("/comparendos");
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/importaciones/comparendos" className="hover:text-foreground transition-colors">
            Importaciones
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="text-foreground">Importar documentos de comparendo</span>
        </nav>
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Importar documentos de comparendo
          </h1>
        </div>
        <p className="text-muted-foreground">
          Importe PDFs de comparendo en masa. El nombre de cada archivo debe ser el número de comparendo.
        </p>
      </div>

      <ImportarComparendosForm />
    </div>
  );
}
