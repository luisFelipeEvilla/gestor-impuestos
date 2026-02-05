import Link from "next/link";
import { crearUsuario } from "@/lib/actions/usuarios";
import { UsuarioForm } from "@/components/usuarios/usuario-form";
import { Button } from "@/components/ui/button";

export default function NuevoUsuarioPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/usuarios">← Usuarios</Link>
        </Button>
      </div>
      <div className="max-w-lg">
        <UsuarioForm action={crearUsuario} submitLabel="Crear usuario" />
      </div>
    </div>
  );
}
