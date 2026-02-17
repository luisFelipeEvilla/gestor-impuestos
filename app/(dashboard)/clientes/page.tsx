import Link from "next/link";
import { Suspense } from "react";
import { Briefcase, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { clientes } from "@/lib/db/schema";
import { eq, and, ilike, desc } from "drizzle-orm";
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
import { EmptyState } from "@/components/ui/empty-state";
import { FiltroBusquedaClientes } from "./filtro-busqueda";
import { unstable_noStore } from "next/cache";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = { searchParams: Promise<{ inactivos?: string; q?: string }> };

export default async function ClientesPage({ searchParams }: Props) {
  unstable_noStore();
  const { inactivos: inactivosParam, q: query } = await searchParams;
  const verInactivos = inactivosParam === "1";
  const busqueda = (query ?? "").trim();

  const condiciones = [];
  if (!verInactivos) condiciones.push(eq(clientes.activo, true));
  if (busqueda.length > 0) {
    condiciones.push(ilike(clientes.nombre, `%${busqueda}%`));
  }
  const whereCond = condiciones.length > 0 ? and(...condiciones) : undefined;

  const lista = await (whereCond
    ? db.select().from(clientes).where(whereCond)
    : db.select().from(clientes)
  )
    .orderBy(desc(clientes.createdAt));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Clientes
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <FiltroBusquedaClientes valorActual={busqueda} verInactivos={verInactivos} />
          </Suspense>
          {!verInactivos ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/clientes?inactivos=1">Ver inactivos</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/clientes">Solo activos</Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/clientes/nuevo">Nuevo cliente</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>
            Clientes de la plataforma (Secretarías, entidades, etc.)
            {verInactivos && " · Mostrando todos (incl. inactivos)"}
            {busqueda && " · Búsqueda aplicada"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              message="No hay clientes. Crea uno desde el botón Nuevo cliente."
              action={{ href: "/clientes/nuevo", label: "Nuevo cliente →" }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[80px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.id}</TableCell>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.codigo ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={c.activo ? "inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success" : "inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"}
                      >
                        {c.activo ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                        <Link href={`/clientes/${c.id}`}>
                          Ver <ChevronRight className="size-4" aria-hidden />
                        </Link>
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
