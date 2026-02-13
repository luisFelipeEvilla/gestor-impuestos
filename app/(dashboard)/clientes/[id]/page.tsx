import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { clientes, impuestos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MiembrosCliente } from "@/components/clientes/miembros-cliente";
import { obtenerMiembrosPorCliente } from "@/lib/actions/clientes-miembros";

type Props = { params: Promise<{ id: string }> };

export default async function DetalleClientePage({ params }: Props) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, id));
  if (!cliente) notFound();

  const [impuestosDelCliente, miembros] = await Promise.all([
    db
      .select({ id: impuestos.id, codigo: impuestos.codigo, nombre: impuestos.nombre, activo: impuestos.activo })
      .from(impuestos)
      .where(eq(impuestos.clienteId, id)),
    obtenerMiembrosPorCliente(id),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/clientes">← Clientes</Link>
        </Button>
        <Button asChild>
          <Link href={`/clientes/${cliente.id}/editar`}>Editar</Link>
        </Button>
      </div>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{cliente.nombre}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            {cliente.codigo && <span>Código: {cliente.codigo}</span>}
            {cliente.activo ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Activo</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Inactivo</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Nombre</dt>
              <dd className="font-medium">{cliente.nombre}</dd>
            </div>
            {cliente.codigo && (
              <div>
                <dt className="text-muted-foreground">Código</dt>
                <dd className="font-medium">{cliente.codigo}</dd>
              </div>
            )}
            {cliente.descripcion && (
              <div>
                <dt className="text-muted-foreground">Descripción</dt>
                <dd>{cliente.descripcion}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Estado</dt>
              <dd>
                {cliente.activo ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Activo</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Inactivo</span>
                )}
              </dd>
            </div>
          </dl>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Impuestos asociados</h3>
            {impuestosDelCliente.length === 0 ? (
              <p className="text-muted-foreground text-sm">Ningún impuesto asociado.</p>
            ) : (
              <ul className="space-y-1">
                {impuestosDelCliente.map((i) => (
                  <li key={i.id}>
                    <Link
                      href={`/impuestos/${i.id}`}
                      className="text-primary hover:underline"
                    >
                      {i.codigo} – {i.nombre}
                      {!i.activo && " (inactivo)"}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
      <MiembrosCliente clienteId={id} miembros={miembros} />
    </div>
  );
}
