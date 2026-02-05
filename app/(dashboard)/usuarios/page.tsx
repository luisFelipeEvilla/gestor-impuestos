import Link from "next/link";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FiltroInactivosUsuarios } from "./filtro-inactivos";

type Props = { searchParams: Promise<{ inactivos?: string }> };

export default async function UsuariosPage({ searchParams }: Props) {
  const { inactivos: inactivosParam } = await searchParams;
  const verInactivos = inactivosParam === "1";

  const lista = verInactivos
    ? await db.select().from(usuarios)
    : await db.select().from(usuarios).where(eq(usuarios.activo, true));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Usuarios
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <FiltroInactivosUsuarios verInactivos={verInactivos} />
          <Button asChild>
            <Link href="/usuarios/nuevo">Nuevo usuario</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>
            Administradores y empleados del sistema
            {verInactivos && " · Mostrando todos (incl. inactivos)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay usuarios registrados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="w-20">Estado</TableHead>
                  <TableHead className="w-[80px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.nombre}</TableCell>
                    <TableCell className="capitalize">{u.rol}</TableCell>
                    <TableCell>
                      {u.activo ? (
                        <span className="text-muted-foreground">Activo</span>
                      ) : (
                        <span className="text-destructive">Inactivo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" asChild>
                        <Link href={`/usuarios/${u.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
