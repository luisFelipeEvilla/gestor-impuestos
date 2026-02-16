import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { usuarios, cargosEmpresa } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  EliminarUsuarioButton,
  DesactivarUsuarioButton,
  ActivarUsuarioButton,
} from "./botones-usuario";

type Props = { params: Promise<{ id: string }> };

export default async function DetalleUsuarioPage({ params }: Props) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [row] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      cargoId: usuarios.cargoId,
      cargoNombre: cargosEmpresa.nombre,
    })
    .from(usuarios)
    .leftJoin(cargosEmpresa, eq(usuarios.cargoId, cargosEmpresa.id))
    .where(eq(usuarios.id, id));
  if (!row) notFound();
  const usuario = { ...row, cargoNombre: row.cargoNombre ?? null };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/usuarios">← Usuarios</Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/usuarios/${usuario.id}/editar`}>Editar</Link>
          </Button>
          {usuario.activo ? (
            <DesactivarUsuarioButton id={usuario.id} />
          ) : (
            <ActivarUsuarioButton id={usuario.id} />
          )}
          <EliminarUsuarioButton id={usuario.id} />
        </div>
      </div>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{usuario.nombre}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>{usuario.email}</span>
            <span>·</span>
            <span>Rol: {usuario.rol === "admin" ? "Administrador" : "Empleado"}</span>
            {usuario.activo ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Activo</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Inactivo</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{usuario.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Nombre</dt>
              <dd className="font-medium">{usuario.nombre}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rol</dt>
              <dd className="font-medium capitalize">{usuario.rol}</dd>
            </div>
            {usuario.cargoNombre && (
              <div>
                <dt className="text-muted-foreground">Cargo en la compañía</dt>
                <dd className="font-medium">{usuario.cargoNombre}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Estado</dt>
              <dd>
                {usuario.activo ? (
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
