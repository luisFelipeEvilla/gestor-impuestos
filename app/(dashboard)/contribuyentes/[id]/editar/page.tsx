import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { contribuyentes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { actualizarContribuyente } from "@/lib/actions/contribuyentes";
import { ContribuyenteForm } from "@/components/contribuyentes/contribuyente-form";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export default async function EditarContribuyentePage({ params }: Props) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [contribuyente] = await db
    .select()
    .from(contribuyentes)
    .where(eq(contribuyentes.id, id));
  if (!contribuyente) notFound();

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/contribuyentes/${contribuyente.id}`}>← Ver contribuyente</Link>
        </Button>
      </div>
      <div className="max-w-lg">
        <ContribuyenteForm
          action={actualizarContribuyente}
          initialData={contribuyente}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  );
}
