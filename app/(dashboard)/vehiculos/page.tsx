import Link from "next/link";
import { Suspense } from "react";
import { Car, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { vehiculos, contribuyentes, impuestos } from "@/lib/db/schema";
import { eq, ilike, or, and, count, desc } from "drizzle-orm";
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
import { Paginacion } from "@/components/ui/paginacion";
import { FiltroBusquedaVehiculos } from "./filtro-busqueda";
import { FiltroClaseVehiculos } from "./filtro-clase";
import { parsePerPage } from "@/lib/pagination";
import { unstable_noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  searchParams: Promise<{ q?: string; clase?: string; page?: string; perPage?: string }>;
};

function buildUrl(params: { q?: string; clase?: string; page?: number; perPage?: number }): string {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.clase?.trim()) sp.set("clase", params.clase.trim());
  if (params.perPage != null) sp.set("perPage", String(params.perPage));
  if (params.page != null && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return s ? `/vehiculos?${s}` : "/vehiculos";
}

export default async function VehiculosPage({ searchParams }: Props) {
  unstable_noStore();
  const params = await searchParams;
  const busqueda = (params.q ?? "").trim();
  const claseParam = (params.clase ?? "").trim() || undefined;
  const pageSize = parsePerPage(params.perPage);
  const pageRaw = params.page ? parseInt(params.page, 10) : 1;
  const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;

  const filtroBusqueda =
    busqueda.length > 0
      ? or(
          ilike(vehiculos.placa, `%${busqueda}%`),
          ilike(vehiculos.marca, `%${busqueda}%`),
          ilike(vehiculos.linea, `%${busqueda}%`),
          ilike(vehiculos.clase, `%${busqueda}%`),
          ilike(contribuyentes.nombreRazonSocial, `%${busqueda}%`),
          ilike(contribuyentes.nit, `%${busqueda}%`),
        )
      : undefined;
  const filtroClase = claseParam ? eq(vehiculos.clase, claseParam) : undefined;
  const condiciones =
    filtroBusqueda && filtroClase
      ? and(filtroBusqueda, filtroClase)
      : filtroBusqueda ?? filtroClase;

  // Total count (with join so the filter on contribuyentes columns works)
  const countBase = db
    .select({ count: count() })
    .from(vehiculos)
    .leftJoin(contribuyentes, eq(vehiculos.contribuyenteId, contribuyentes.id));
  const [countResult] = condiciones
    ? await countBase.where(condiciones)
    : await countBase;
  const total = Number(countResult?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;

  // Paginated data
  const listaBase = db
    .select({
      id: vehiculos.id,
      placa: vehiculos.placa,
      marca: vehiculos.marca,
      linea: vehiculos.linea,
      clase: vehiculos.clase,
      modelo: vehiculos.modelo,
      cilindraje: vehiculos.cilindraje,
      contribuyenteId: contribuyentes.id,
      contribuyenteNombre: contribuyentes.nombreRazonSocial,
      contribuyenteNit: contribuyentes.nit,
      totalImpuestos: count(impuestos.id),
    })
    .from(vehiculos)
    .leftJoin(contribuyentes, eq(vehiculos.contribuyenteId, contribuyentes.id))
    .leftJoin(impuestos, eq(impuestos.vehiculoId, vehiculos.id))
    .groupBy(
      vehiculos.id,
      contribuyentes.id,
      contribuyentes.nombreRazonSocial,
      contribuyentes.nit,
    )
    .orderBy(desc(vehiculos.creadoEn))
    .limit(pageSize)
    .offset(offset);

  const lista = condiciones
    ? await listaBase.where(condiciones)
    : await listaBase;

  const selectorSearchParams: Record<string, string> = {};
  if (busqueda) selectorSearchParams.q = busqueda;
  if (claseParam) selectorSearchParams.clase = claseParam;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Vehículos</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <FiltroBusquedaVehiculos valorActual={busqueda} claseActual={claseParam} />
          </Suspense>
          <FiltroClaseVehiculos claseActual={claseParam} query={busqueda || undefined} />
          <Button asChild>
            <Link href="/vehiculos/nuevo">Nuevo vehículo</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de vehículos</CardTitle>
          <CardDescription>
            Vehículos registrados en el sistema con sus impuestos asociados
            {claseParam && ` · Clase: ${claseParam.charAt(0) + claseParam.slice(1).toLowerCase()}`}
            {busqueda && " · Búsqueda aplicada"}
            {" · "}{total.toLocaleString("es-CO")} resultado{total !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <EmptyState
              icon={Car}
              message="No hay vehículos registrados. Importa desde CSV o crea uno manualmente."
              action={{ href: "/vehiculos/nuevo", label: "Nuevo vehículo →" }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Propietario</TableHead>
                  <TableHead className="text-center">Impuestos</TableHead>
                  <TableHead className="w-[80px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <span className="font-mono font-semibold tracking-wide">{v.placa}</span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{[v.marca, v.linea].filter(Boolean).join(" · ") || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {[v.clase, v.cilindraje ? `${v.cilindraje} cc` : null].filter(Boolean).join(" · ") || ""}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{v.modelo ?? "—"}</TableCell>
                    <TableCell>
                      {v.contribuyenteId ? (
                        <>
                          <div className="font-medium">{v.contribuyenteNombre}</div>
                          <div className="text-xs text-muted-foreground">{v.contribuyenteNit}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {v.totalImpuestos}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                        <Link href={`/vehiculos/${v.id}`}>
                          Ver <ChevronRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Paginacion
            currentPage={currentPage}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            buildPageUrl={(p) => buildUrl({ q: busqueda || undefined, clase: claseParam, perPage: pageSize, page: p })}
            formAction="/vehiculos"
            selectorSearchParams={selectorSearchParams}
          />
        </CardContent>
      </Card>
    </div>
  );
}
