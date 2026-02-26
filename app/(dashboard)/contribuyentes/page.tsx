import Link from "next/link";
import { Suspense } from "react";
import { Building2, ChevronRight } from "lucide-react";
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
import { DataTable, type ColumnaTabla } from "@/components/ui/data-table";
import { Paginacion } from "@/components/ui/paginacion";
import { FiltroBusquedaContribuyentes } from "./filtro-busqueda";
import { parsePerPage } from "@/lib/pagination";
import { unstable_noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { searchParams: Promise<{ q?: string; page?: string; perPage?: string }> };

type Fila = typeof contribuyentes.$inferSelect;

function buildUrl(params: { q?: string; page?: number; perPage?: number }): string {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.perPage != null) sp.set("perPage", String(params.perPage));
  if (params.page != null && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return s ? `/contribuyentes?${s}` : "/contribuyentes";
}

const columnas: ColumnaTabla<Fila>[] = [
  {
    key: "nit",
    encabezado: "NIT",
    celda: (c) => c.nit,
  },
  {
    key: "nombre",
    encabezado: "Nombre / Razón social",
    celda: (c) => c.nombreRazonSocial,
  },
  {
    key: "ciudad",
    encabezado: "Ciudad",
    celda: (c) => c.ciudad ?? "—",
  },
  {
    key: "accion",
    encabezado: "Acción",
    className: "w-[80px]",
    celda: (c) => (
      <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
        <Link href={`/contribuyentes/${c.id}`}>
          Ver <ChevronRight className="size-4" aria-hidden />
        </Link>
      </Button>
    ),
  },
];

export default async function ContribuyentesPage({ searchParams }: Props) {
  unstable_noStore();
  const params = await searchParams;
  const busqueda = (params.q ?? "").trim();
  const pageSize = parsePerPage(params.perPage);
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;

  const baseQuery = db.select().from(contribuyentes);
  const lista = await (whereCond ? baseQuery.where(whereCond) : baseQuery)
    .orderBy(desc(contribuyentes.createdAt))
    .limit(pageSize)
    .offset(offset);

  const selectorSearchParams: Record<string, string> = busqueda ? { q: busqueda } : {};

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
          <DataTable
            columnas={columnas}
            datos={lista}
            rowKey={(c) => c.id}
            sinDatos={{
              icon: Building2,
              message: "No hay contribuyentes registrados. Crea uno desde el botón Nuevo contribuyente.",
              action: { href: "/contribuyentes/nuevo", label: "Nuevo contribuyente →" },
            }}
          />
          <Paginacion
            currentPage={currentPage}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            buildPageUrl={(p) => buildUrl({ q: busqueda || undefined, perPage: pageSize, page: p })}
            formAction="/contribuyentes"
            selectorSearchParams={selectorSearchParams}
          />
        </CardContent>
      </Card>
    </div>
  );
}
