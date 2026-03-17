import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { clientes, usuarios } from "@/lib/db/schema";
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
import { unstable_noStore } from "next/cache";
import { UserPlus } from "lucide-react";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = { params: Promise<{ id: string }> };

export default async function DetalleClientePage({ params }: Props) {
  unstable_noStore();
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, id));
  if (!cliente) notFound();

  const [miembros, usuariosCliente] = await Promise.all([
    obtenerMiembrosPorCliente(id),
    db
      .select({ id: usuarios.id, nombre: usuarios.nombre, email: usuarios.email, activo: usuarios.activo })
      .from(usuarios)
      .where(eq(usuarios.clienteId, id))
      .orderBy(usuarios.nombre),
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
            {(cliente.emailContacto ?? cliente.nombreContacto) && (
              <div>
                <dt className="text-muted-foreground">Contacto</dt>
                <dd>
                  {cliente.nombreContacto && <span className="font-medium">{cliente.nombreContacto}</span>}
                  {cliente.nombreContacto && cliente.emailContacto && " · "}
                  {cliente.emailContacto && (
                    <a href={`mailto:${cliente.emailContacto}`} className="text-primary hover:underline">
                      {cliente.emailContacto}
                    </a>
                  )}
                </dd>
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
        </CardContent>
      </Card>
      <MiembrosCliente clienteId={id} miembros={miembros} />

      {/* Usuarios del cliente */}
      <Card className="mx-auto max-w-2xl mt-6">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Usuarios del cliente</CardTitle>
            <CardDescription>
              Accesos de login para personal de {cliente.nombre}.
            </CardDescription>
          </div>
          <Button size="sm" asChild>
            <Link href={`/clientes/${id}/usuarios/nuevo`}>
              <UserPlus className="mr-2 size-4" />
              Nuevo usuario
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {usuariosCliente.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay usuarios creados para este cliente.
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {usuariosCliente.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{u.nombre}</p>
                    <p className="text-muted-foreground text-xs">{u.email}</p>
                  </div>
                  {u.activo ? (
                    <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Inactivo
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
