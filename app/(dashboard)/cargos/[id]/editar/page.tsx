import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { cargosEmpresa } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { actualizarCargoEmpresa } from "@/lib/actions/cargos-empresa";
import { CargoForm } from "@/components/cargos/cargo-form";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export default async function EditarCargoPage({ params }: Props) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [cargo] = await db
    .select()
    .from(cargosEmpresa)
    .where(eq(cargosEmpresa.id, id));
  if (!cargo) notFound();

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/cargos">← Cargos</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-2xl">
        <CargoForm
          action={actualizarCargoEmpresa}
          initialData={cargo}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  );
}
