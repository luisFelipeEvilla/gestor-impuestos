import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { ImportarProcesosForm } from "@/components/procesos/importar-procesos-form";
import { ImportarAcuerdosForm } from "@/components/procesos/importar-acuerdos-form";
import { ImportarTabs } from "../../../../components/procesos/importar-tabs";
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
          <Link href="/importaciones" className="hover:text-foreground transition-colors">
            Importaciones
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="text-foreground">Importar</span>
        </nav>
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Importar
          </h1>
        </div>
        <p className="text-muted-foreground">
          Importe procesos desde CSV/Excel o acuerdos de pago desde CSV.
        </p>
      </div>

      <ImportarTabs
        procesosTab={<ImportarProcesosForm />}
        acuerdosTab={<ImportarAcuerdosForm />}
      />
    </div>
  );
}
