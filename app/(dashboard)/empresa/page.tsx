import { getEmpresa, actualizarEmpresa } from "@/lib/actions/empresa";
import { listarCargosEmpresa } from "@/lib/actions/cargos-empresa";
import { EmpresaForm } from "@/components/empresa/empresa-form";

import { unstable_noStore } from "next/cache";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: "Configuración de la organización",
  description: "Configuración de la información de tu organización",
};

export default async function EmpresaPage() {
  unstable_noStore();
  const [data, cargos] = await Promise.all([getEmpresa(), listarCargosEmpresa()]);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl">
        <EmpresaForm action={actualizarEmpresa} initialData={data} cargos={cargos} />
      </div>
    </div>
  );
}
