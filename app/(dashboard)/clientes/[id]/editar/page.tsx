import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { clientes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { actualizarCliente } from "@/lib/actions/clientes";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export default async function EditarClientePage({ params }: Props) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, id));
  if (!cliente) notFound();

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/clientes/${cliente.id}`}>← Ver cliente</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-2xl">
        <ClienteForm
          action={actualizarCliente}
          initialData={cliente}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  );
}
