import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { impuestos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EliminarImpuestoButton, DesactivarImpuestoButton } from "./botones-impuesto";

type Props = { params: Promise<{ id: string }> };

export default async function DetalleImpuestoPage({ params }: Props) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [impuesto] = await db.select().from(impuestos).where(eq(impuestos.id, id));
  if (!impuesto) notFound();

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/impuestos">← Impuestos</Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/impuestos/${impuesto.id}/editar`}>Editar</Link>
          </Button>
          {impuesto.activo && (
            <DesactivarImpuestoButton id={impuesto.id} />
          )}
          <EliminarImpuestoButton id={impuesto.id} />
        </div>
      </div>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{impuesto.nombre}</CardTitle>
          <CardDescription>
            Código: {impuesto.codigo} · Tipo: {impuesto.tipo === "nacional" ? "Nacional" : "Municipal"}
            {!impuesto.activo && (
              <span className="text-destructive ml-2">· Inactivo</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Código</dt>
              <dd className="font-medium">{impuesto.codigo}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Nombre</dt>
              <dd className="font-medium">{impuesto.nombre}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tipo</dt>
              <dd className="font-medium capitalize">{impuesto.tipo}</dd>
            </div>
            {impuesto.descripcion && (
              <div>
                <dt className="text-muted-foreground">Descripción</dt>
                <dd>{impuesto.descripcion}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Estado</dt>
              <dd>{impuesto.activo ? "Activo" : "Inactivo"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
