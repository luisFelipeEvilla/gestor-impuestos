import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { impuestos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { actualizarImpuesto } from "@/lib/actions/impuestos";
import { ImpuestoForm } from "@/components/impuestos/impuesto-form";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export default async function EditarImpuestoPage({ params }: Props) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [impuesto] = await db.select().from(impuestos).where(eq(impuestos.id, id));
  if (!impuesto) notFound();

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/impuestos/${impuesto.id}`}>← Ver impuesto</Link>
        </Button>
      </div>
      <div className="max-w-lg">
        <ImpuestoForm
          action={actualizarImpuesto}
          initialData={impuesto}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  );
}
