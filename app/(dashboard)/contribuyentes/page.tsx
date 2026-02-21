import Link from "next/link";
import { Suspense } from "react";
import { Building2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { db } from "@/lib/db";
import { contribuyentes } from "@/lib/db/schema";
import { count, desc, or, ilike } from "drizzle-orm";
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
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { FiltroBusquedaContribuyentes } from "./filtro-busqueda";
import { unstable_noStore } from "next/cache";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PAGE_SIZE = 15;

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

function buildQueryString(params: { q?: string; page?: number }): string {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.page != null && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function ContribuyentesPage({ searchParams }: Props) {
  unstable_noStore();
  const params = await searchParams;
  const busqueda = (params.q ?? "").trim();
  const pageRaw = params.page ? parseInt(params.page, 10) : 1;
  const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;

  const whereCond =
    busqueda.length > 0
      ? or(
          ilike(contribuyentes.nombreRazonSocial, `%${busqueda}%`),
          ilike(contribuyentes.nit, `%${busqueda}%`)
        )
      : undefined;

  const countQuery = db.select({ count: count() }).from(contribuyentes);
  const [countResult] = whereCond
    ? await countQuery.where(whereCond)
    : await countQuery;
  const total = Number(countResult?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const baseQuery = db.select().from(contribuyentes);
  const lista = await (whereCond
    ? baseQuery.where(whereCond)
    : baseQuery)
    .orderBy(desc(contribuyentes.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

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
            <>
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
              {totalPages > 1 && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-border/80 pt-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                    {total > 0 && (
                      <span className="ml-1">
                        · {total} resultado{total !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                  <nav className="flex flex-wrap items-center gap-2" aria-label="Paginación">
                    {currentPage <= 1 ? (
                      <Button variant="outline" size="sm" className="gap-1" disabled>
                        <ChevronsLeft className="size-4" aria-hidden />
                        Primera
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1" asChild>
                        <Link href={`/contribuyentes${buildQueryString({ q: busqueda || undefined, page: 1 })}`}>
                          <ChevronsLeft className="size-4" aria-hidden />
                          Primera
                        </Link>
                      </Button>
                    )}
                    {currentPage <= 1 ? (
                      <Button variant="outline" size="sm" className="gap-1" disabled>
                        <ChevronLeft className="size-4" aria-hidden />
                        Anterior
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1" asChild>
                        <Link href={`/contribuyentes${buildQueryString({ q: busqueda || undefined, page: currentPage - 1 })}`}>
                          <ChevronLeft className="size-4" aria-hidden />
                          Anterior
                        </Link>
                      </Button>
                    )}
                    <span className="px-2 text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
                    {currentPage >= totalPages ? (
                      <Button variant="outline" size="sm" className="gap-1" disabled>
                        Siguiente
                        <ChevronRight className="size-4" aria-hidden />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1" asChild>
                        <Link href={`/contribuyentes${buildQueryString({ q: busqueda || undefined, page: currentPage + 1 })}`}>
                          Siguiente
                          <ChevronRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    )}
                    {currentPage >= totalPages ? (
                      <Button variant="outline" size="sm" className="gap-1" disabled>
                        Última
                        <ChevronsRight className="size-4" aria-hidden />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1" asChild>
                        <Link href={`/contribuyentes${buildQueryString({ q: busqueda || undefined, page: totalPages })}`}>
                          Última
                          <ChevronsRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    )}
                    <form method="GET" action="/contribuyentes" className="flex items-center gap-1.5">
                      {busqueda ? (
                        <input type="hidden" name="q" value={busqueda} />
                      ) : null}
                      <label htmlFor="contribuyentes-page-go" className="sr-only">
                        Ir a página
                      </label>
                      <Input
                        id="contribuyentes-page-go"
                        type="number"
                        name="page"
                        min={1}
                        max={totalPages}
                        defaultValue={currentPage}
                        className="w-16 h-8 text-center text-sm"
                        aria-label="Número de página"
                      />
                      <Button type="submit" variant="secondary" size="sm">
                        Ir
                      </Button>
                    </form>
                  </nav>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
