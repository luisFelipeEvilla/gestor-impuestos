import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { contribuyentes } from "@/lib/db/schema";
import { desc, or, ilike } from "drizzle-orm";
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
import { FiltroBusquedaContribuyentes } from "./filtro-busqueda";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function ContribuyentesPage({ searchParams }: Props) {
  const { q: query } = await searchParams;
  const busqueda = (query ?? "").trim();
  const whereCond =
    busqueda.length > 0
      ? or(
          ilike(contribuyentes.nombreRazonSocial, `%${busqueda}%`),
          ilike(contribuyentes.nit, `%${busqueda}%`)
        )
      : undefined;

  const baseQuery = db.select().from(contribuyentes);
  const lista = await (whereCond
    ? baseQuery.where(whereCond)
    : baseQuery)
    .orderBy(desc(contribuyentes.createdAt))
    .limit(50);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Contribuyentes
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <FiltroBusquedaContribuyentes valorActual={busqueda} />
          </Suspense>
          <Button asChild>
            <Link href="/contribuyentes/nuevo">Nuevo contribuyente</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>
            Personas o entidades a las que se realiza el cobro (NIT / cédula)
            {busqueda && " · Búsqueda aplicada"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay contribuyentes registrados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIT</TableHead>
                  <TableHead>Nombre / Razón social</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead className="w-[80px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.nit}</TableCell>
                    <TableCell>{c.nombreRazonSocial}</TableCell>
                    <TableCell>{c.ciudad ?? "—"}</TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" asChild>
                        <Link href={`/contribuyentes/${c.id}`}>Ver</Link>
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
