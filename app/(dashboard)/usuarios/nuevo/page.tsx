import Link from "next/link";
import { crearUsuario } from "@/lib/actions/usuarios";
import { listarCargosEmpresa } from "@/lib/actions/cargos-empresa";
import { UsuarioForm } from "@/components/usuarios/usuario-form";
import { Button } from "@/components/ui/button";

export default async function NuevoUsuarioPage() {
  const cargos = await listarCargosEmpresa();
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/usuarios">← Usuarios</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-2xl">
        <UsuarioForm action={crearUsuario} cargos={cargos} submitLabel="Crear usuario" />
      </div>
    </div>
  );
}
