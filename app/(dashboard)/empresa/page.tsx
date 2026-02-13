import { getEmpresa, actualizarEmpresa } from "@/lib/actions/empresa";
import { listarCargosEmpresa } from "@/lib/actions/cargos-empresa";
import { EmpresaForm } from "@/components/empresa/empresa-form";

export const metadata = {
  title: "Datos de la empresa",
  description: "Configuración de la información de tu empresa",
};

export default async function EmpresaPage() {
  const [data, cargos] = await Promise.all([getEmpresa(), listarCargosEmpresa()]);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl">
        <EmpresaForm action={actualizarEmpresa} initialData={data} cargos={cargos} />
      </div>
    </div>
  );
}
