import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { actualizarUsuario } from "@/lib/actions/usuarios";
import { UsuarioForm } from "@/components/usuarios/usuario-form";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export default async function EditarUsuarioPage({ params }: Props) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [usuario] = await db.select().from(usuarios).where(eq(usuarios.id, id));
  if (!usuario) notFound();

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/usuarios/${usuario.id}`}>← Ver usuario</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-2xl">
        <UsuarioForm
          action={actualizarUsuario}
          initialData={usuario}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  );
}
