import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { impuestos, clientes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EliminarImpuestoButton, DesactivarImpuestoButton, ActivarImpuestoButton } from "./botones-impuesto";

type Props = { params: Promise<{ id: string }> };

export default async function DetalleImpuestoPage({ params }: Props) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [row] = await db
    .select({
      id: impuestos.id,
      codigo: impuestos.codigo,
      nombre: impuestos.nombre,
      tipo: impuestos.tipo,
      naturaleza: impuestos.naturaleza,
      descripcion: impuestos.descripcion,
      activo: impuestos.activo,
      clienteId: impuestos.clienteId,
      clienteNombre: clientes.nombre,
    })
    .from(impuestos)
    .leftJoin(clientes, eq(impuestos.clienteId, clientes.id))
    .where(eq(impuestos.id, id));
  if (!row) notFound();
  const impuesto = row;

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
          {impuesto.activo ? (
            <DesactivarImpuestoButton id={impuesto.id} />
          ) : (
            <ActivarImpuestoButton id={impuesto.id} />
          )}
          <EliminarImpuestoButton id={impuesto.id} />
        </div>
      </div>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{impuesto.nombre}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>Código: {impuesto.codigo}</span>
            <span>·</span>
            <span>Naturaleza: {impuesto.naturaleza === "no_tributario" ? "No tributario" : "Tributario"}</span>
            <span>·</span>
            <span>Ámbito: {impuesto.tipo === "nacional" ? "Nacional" : "Municipal"}</span>
            {impuesto.clienteNombre && (
              <>
                <span>·</span>
                <span>Cliente: {impuesto.clienteNombre}</span>
              </>
            )}
            {impuesto.activo ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Activo</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Inactivo</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <dl className="grid gap-2 text-sm">
            {impuesto.clienteId && impuesto.clienteNombre && (
              <div>
                <dt className="text-muted-foreground">Cliente</dt>
                <dd className="font-medium">
                  <Link href={`/clientes/${impuesto.clienteId}`} className="text-primary hover:underline">
                    {impuesto.clienteNombre}
                  </Link>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Código</dt>
              <dd className="font-medium">{impuesto.codigo}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Nombre</dt>
              <dd className="font-medium">{impuesto.nombre}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Naturaleza</dt>
              <dd className="font-medium">{impuesto.naturaleza === "no_tributario" ? "No tributario" : "Tributario"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ámbito (tipo)</dt>
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
              <dd>
                {impuesto.activo ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Activo</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Inactivo</span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
