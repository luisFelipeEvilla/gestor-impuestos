import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
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

  const [usuario] = await db.select().from(usuarios).where(eq(usuarios.id, id));
  if (!usuario) notFound();

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
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{usuario.nombre}</CardTitle>
          <CardDescription>
            {usuario.email} · Rol: {usuario.rol === "admin" ? "Administrador" : "Empleado"}
            {!usuario.activo && (
              <span className="text-destructive ml-2">· Inactivo</span>
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
            <div>
              <dt className="text-muted-foreground">Estado</dt>
              <dd>{usuario.activo ? "Activo" : "Inactivo"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
