import Link from "next/link";
import { Suspense } from "react";
import { Building2, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { contribuyentes } from "@/lib/db/schema";
import { count, desc, or, and, ilike } from "drizzle-orm";
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

type Props = { searchParams: Promise<{ q?: string; page?: string; perPage?: string; telefono?: string; correo?: string; direccion?: string }> };

type Fila = typeof contribuyentes.$inferSelect;

function labelTipoDoc(tipo: string): string {
  const map: Record<string, string> = {
    nit: "NIT",
    cedula: "C.C.",
    cedula_extranjeria: "C.E.",
    cedula_ecuatoriana: "C.C. Ecuatoriana",
    cedula_venezolana: "C.C. Venezolana",
    pasaporte: "Pasaporte",
    permiso_proteccion_temporal: "PPT",
    tarjeta_identidad: "T.I.",
  };
  return map[tipo] ?? tipo;
}

function buildUrl(params: { q?: string; telefono?: string; correo?: string; direccion?: string; page?: number; perPage?: number }): string {
  const sp = new URLSearchParams();
  if (params.q?.trim())         sp.set("q",         params.q.trim());
  if (params.telefono?.trim())  sp.set("telefono",  params.telefono.trim());
  if (params.correo?.trim())    sp.set("correo",    params.correo.trim());
  if (params.direccion?.trim()) sp.set("direccion", params.direccion.trim());
  if (params.perPage != null)   sp.set("perPage",   String(params.perPage));
  if (params.page != null && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return s ? `/contribuyentes?${s}` : "/contribuyentes";
}

const columnas: ColumnaTabla<Fila>[] = [
  {
    key: "nit",
    encabezado: "No. Identificación",
    celda: (c) => c.nit,
  },
  {
    key: "tipoDocumento",
    encabezado: "Tipo identificación",
    celda: (c) => labelTipoDoc(c.tipoDocumento),
  },
  {
    key: "nombre",
    encabezado: "Nombre / Razón social",
    celda: (c) => c.nombreRazonSocial,
  },
  {
    key: "email",
    encabezado: "Correo",
    celda: (c) => c.email ?? "—",
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
  const busqueda  = (params.q         ?? "").trim();
  const telefono  = (params.telefono  ?? "").trim();
  const correo    = (params.correo    ?? "").trim();
  const direccion = (params.direccion ?? "").trim();
  const pageSize = parsePerPage(params.perPage);
  const pageRaw = params.page ? parseInt(params.page, 10) : 1;
  const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;

  const condiciones = [];
  if (busqueda.length > 0)
    condiciones.push(or(
      ilike(contribuyentes.nombreRazonSocial, `%${busqueda}%`),
      ilike(contribuyentes.nit, `%${busqueda}%`)
    ));
  if (telefono.length > 0)
    condiciones.push(ilike(contribuyentes.telefono, `%${telefono}%`));
  if (correo.length > 0)
    condiciones.push(ilike(contribuyentes.email, `%${correo}%`));
  if (direccion.length > 0)
    condiciones.push(ilike(contribuyentes.direccion, `%${direccion}%`));
  const whereCond = condiciones.length > 0 ? and(...condiciones) : undefined;

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

  const selectorSearchParams: Record<string, string> = {};
  if (busqueda)  selectorSearchParams.q         = busqueda;
  if (telefono)  selectorSearchParams.telefono  = telefono;
  if (correo)    selectorSearchParams.correo    = correo;
  if (direccion) selectorSearchParams.direccion = direccion;

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
            <FiltroBusquedaContribuyentes
              valorActual={busqueda}
              telefonoActual={telefono}
              correoActual={correo}
              direccionActual={direccion}
            />
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
            {(busqueda || telefono || correo || direccion) && " · Filtros aplicados"}
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
            buildPageUrl={(p) => buildUrl({ q: busqueda || undefined, telefono: telefono || undefined, correo: correo || undefined, direccion: direccion || undefined, perPage: pageSize, page: p })}
            formAction="/contribuyentes"
            selectorSearchParams={selectorSearchParams}
          />
        </CardContent>
      </Card>
    </div>
  );
}
