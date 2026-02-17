import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { actualizarUsuario } from "@/lib/actions/usuarios";
import { listarCargosEmpresa } from "@/lib/actions/cargos-empresa";
import { UsuarioForm } from "@/components/usuarios/usuario-form";
import { Button } from "@/components/ui/button";
import { unstable_noStore } from "next/cache";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = { params: Promise<{ id: string }> };

export default async function EditarUsuarioPage({ params }: Props) {
  unstable_noStore();
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [usuario, cargos] = await Promise.all([
    db.select().from(usuarios).where(eq(usuarios.id, id)),
    listarCargosEmpresa(),
  ]);
  const user = usuario[0];
  if (!user) notFound();

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/usuarios/${user.id}`}>← Ver usuario</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-2xl">
        <UsuarioForm
          action={actualizarUsuario}
          initialData={user}
          cargos={cargos}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  );
}
