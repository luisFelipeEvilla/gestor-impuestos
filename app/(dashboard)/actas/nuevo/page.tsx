import Link from "next/link";
import { db } from "@/lib/db";
import { usuarios, clientes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { crearActa } from "@/lib/actions/actas";
import { ActaForm } from "@/components/actas/acta-form";
import { Button } from "@/components/ui/button";

export default async function NuevaActaPage() {
  const [usuariosList, clientesList] = await Promise.all([
    db
      .select({ id: usuarios.id, nombre: usuarios.nombre, email: usuarios.email })
      .from(usuarios)
      .where(eq(usuarios.activo, true)),
    db
      .select({ id: clientes.id, nombre: clientes.nombre, codigo: clientes.codigo })
      .from(clientes)
      .where(eq(clientes.activo, true))
      .orderBy(clientes.nombre),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/actas">← Actas</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-4xl">
        <ActaForm
          action={crearActa}
          submitLabel="Crear acta"
          usuarios={usuariosList}
          clientes={clientesList}
        />
      </div>
    </div>
  );
}
