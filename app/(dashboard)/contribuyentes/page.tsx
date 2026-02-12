import Link from "next/link";
import { Suspense } from "react";
import { Building2, ChevronRight } from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
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
            <EmptyState
              icon={Building2}
              message="No hay contribuyentes registrados. Crea uno desde el botón Nuevo contribuyente."
              action={{ href: "/contribuyentes/nuevo", label: "Nuevo contribuyente →" }}
            />
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
                      <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                        <Link href={`/contribuyentes/${c.id}`}>
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
