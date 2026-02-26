import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { ImportarProcesosForm } from "@/components/procesos/importar-procesos-form";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function ImportarProcesosPage() {
  const session = await getSession();
  if (session?.user?.rol !== "admin") {
    redirect("/procesos");
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/procesos" className="hover:text-foreground transition-colors">
            Procesos de cobro
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="text-foreground">Importar procesos</span>
        </nav>
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Importar procesos
          </h1>
        </div>
        <p className="text-muted-foreground">
          Cargue un archivo CSV o Excel con el reporte de cartera para importar procesos masivamente.
        </p>
      </div>

      <ImportarProcesosForm />
    </div>
  );
}
