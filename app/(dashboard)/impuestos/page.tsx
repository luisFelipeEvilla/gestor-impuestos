import Link from "next/link";
import { Suspense } from "react";
import {
  Receipt,
  ClipboardList,
  AlertTriangle,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { db } from "@/lib/db";
import { impuestos, contribuyentes, vehiculos } from "@/lib/db/schema";
import {
  eq,
  and,
  or,
  ilike,
  desc,
  count,
  sql,
  notInArray,
} from "drizzle-orm";
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
import { FiltrosImpuestos } from "./filtros-impuestos";
import { ChipsFiltrosImpuestos } from "./chips-filtros-impuestos";
import { parsePerPage } from "@/lib/pagination";
import { unstable_noStore } from "next/cache";
import { DashboardGraficoEstadosImpuestos } from "@/components/dashboard/dashboard-grafico-estados-impuestos";
import { GraficoProcesosPorVigencia } from "@/components/procesos/grafico-procesos-por-vigencia";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ETIQUETAS_ESTADO: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-muted text-muted-foreground" },
  declarado: { label: "Declarado", className: "bg-blue-500/15 text-blue-700" },
  liquidado: { label: "Liquidado", className: "bg-yellow-500/15 text-yellow-700" },
  notificado: { label: "Notificado", className: "bg-orange-500/15 text-orange-700" },
  en_cobro_coactivo: { label: "Cobro coactivo", className: "bg-destructive/15 text-destructive" },
  pagado: { label: "Pagado", className: "bg-success/15 text-success" },
  cerrado: { label: "Cerrado", className: "bg-muted text-muted-foreground" },
};

const ORDEN_ESTADOS = [
  "pendiente",
  "declarado",
  "liquidado",
  "notificado",
  "en_cobro_coactivo",
  "pagado",
  "cerrado",
];

type Props = {
  searchParams: Promise<{
    estado?: string;
    q?: string;
    vigencia?: string;
    page?: string;
    perPage?: string;
  }>;
};

function buildUrl(params: {
  q?: string;
  estado?: string;
  vigencia?: number | null;
  page?: number;
  perPage?: number;
}): string {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.estado) sp.set("estado", params.estado);
  if (params.vigencia != null) sp.set("vigencia", String(params.vigencia));
  if (params.perPage != null) sp.set("perPage", String(params.perPage));
  if (params.page != null && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return s ? `/impuestos?${s}` : "/impuestos";
}

function formatMonto(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function ImpuestosPage({ searchParams }: Props) {
  unstable_noStore();
  const {
    estado: estadoParam,
    q: query,
    vigencia: vigenciaParam,
    page: pageParam,
    perPage: perPageParam,
  } = await searchParams;

  const busqueda = (query ?? "").trim();
  const pageSize = parsePerPage(perPageParam);
  const pageRaw = pageParam ? parseInt(pageParam, 10) : 1;
  const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;

  const estadoActual =
    estadoParam && estadoParam in ETIQUETAS_ESTADO ? estadoParam : null;
  const vigenciaNum =
    vigenciaParam && /^\d{4}$/.test(vigenciaParam)
      ? parseInt(vigenciaParam, 10)
      : null;

  // Build conditions
  const condiciones = [];
  if (estadoActual) {
    condiciones.push(
      eq(
        impuestos.estadoActual,
        estadoActual as
          | "pendiente"
          | "declarado"
          | "liquidado"
          | "notificado"
          | "en_cobro_coactivo"
          | "pagado"
          | "cerrado"
      )
    );
  }
  if (vigenciaNum != null) {
    condiciones.push(eq(impuestos.vigencia, vigenciaNum));
  }
  if (busqueda.length > 0) {
    condiciones.push(
      or(
        ilike(contribuyentes.nombreRazonSocial, `%${busqueda}%`),
        ilike(contribuyentes.nit, `%${busqueda}%`),
        ilike(impuestos.noExpediente, `%${busqueda}%`),
        ilike(vehiculos.placa, `%${busqueda}%`)
      )
    );
  }
  const where = condiciones.length > 0 ? and(...condiciones) : undefined;
  const offset = (page - 1) * pageSize;

  const countQ = db
    .select({ total: count(impuestos.id) })
    .from(impuestos)
    .leftJoin(contribuyentes, eq(impuestos.contribuyenteId, contribuyentes.id))
    .leftJoin(vehiculos, eq(impuestos.vehiculoId, vehiculos.id));

  const listQ = db
    .select({
      id: impuestos.id,
      vigencia: impuestos.vigencia,
      tipoPeriodo: impuestos.tipoPeriodo,
      periodo: impuestos.periodo,
      totalAPagar: impuestos.totalAPagar,
      estadoActual: impuestos.estadoActual,
      contribuyenteNombre: contribuyentes.nombreRazonSocial,
      contribuyenteNit: contribuyentes.nit,
      placa: vehiculos.placa,
    })
    .from(impuestos)
    .leftJoin(contribuyentes, eq(impuestos.contribuyenteId, contribuyentes.id))
    .leftJoin(vehiculos, eq(impuestos.vehiculoId, vehiculos.id));

  const estadosQ = db
    .select({
      estado: impuestos.estadoActual,
      count: sql<number>`count(${impuestos.id})::int`,
    })
    .from(impuestos)
    .leftJoin(contribuyentes, eq(impuestos.contribuyenteId, contribuyentes.id))
    .leftJoin(vehiculos, eq(impuestos.vehiculoId, vehiculos.id))
    .groupBy(impuestos.estadoActual);

  const vigenciasQ = db
    .select({
      vigencia: impuestos.vigencia,
      count: sql<number>`count(${impuestos.id})::int`,
    })
    .from(impuestos)
    .leftJoin(contribuyentes, eq(impuestos.contribuyenteId, contribuyentes.id))
    .leftJoin(vehiculos, eq(impuestos.vehiculoId, vehiculos.id))
    .groupBy(impuestos.vigencia)
    .orderBy(desc(impuestos.vigencia))
    .limit(10);

  const montoGestionWhere = where
    ? and(where, notInArray(impuestos.estadoActual, ["pagado", "cerrado"]))
    : notInArray(impuestos.estadoActual, ["pagado", "cerrado"]);

  const montoQ = db
    .select({
      total: sql<string>`coalesce(sum(${impuestos.totalAPagar}), 0)::text`,
    })
    .from(impuestos)
    .leftJoin(contribuyentes, eq(impuestos.contribuyenteId, contribuyentes.id))
    .leftJoin(vehiculos, eq(impuestos.vehiculoId, vehiculos.id))
    .where(montoGestionWhere);

  const [countResult, lista, porEstadoRaw, porVigenciaRaw, montoResult] =
    await Promise.all([
      where ? countQ.where(where) : countQ,
      where
        ? listQ.where(where).orderBy(desc(impuestos.creadoEn)).limit(pageSize).offset(offset)
        : listQ.orderBy(desc(impuestos.creadoEn)).limit(pageSize).offset(offset),
      where ? estadosQ.where(where) : estadosQ,
      where ? vigenciasQ.where(where) : vigenciasQ,
      montoQ,
    ]);

  const total = Number(countResult[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  // Compute KPIs from porEstado
  const porEstadoMap = Object.fromEntries(
    porEstadoRaw.map((r) => [r.estado, r.count])
  );
  const enCobroCoactivo = porEstadoMap["en_cobro_coactivo"] ?? 0;
  const pagados = porEstadoMap["pagado"] ?? 0;
  const cerrados = porEstadoMap["cerrado"] ?? 0;
  const enGestion = total - pagados - cerrados;
  const montoEnGestion = montoResult[0]?.total ?? "0";

  // Sort chart data
  const porEstadoOrdenado = ORDEN_ESTADOS.flatMap((e) => {
    const row = porEstadoRaw.find((r) => r.estado === e);
    return row ? [{ estado: row.estado, count: row.count }] : [];
  });
  const porVigenciaOrdenado = [...porVigenciaRaw].reverse();

  const tieneFiltros =
    estadoActual != null || vigenciaNum != null || busqueda.length > 0;

  const selectorSearchParams: Record<string, string> = {};
  if (busqueda) selectorSearchParams.q = busqueda;
  if (estadoActual) selectorSearchParams.estado = estadoActual;
  if (vigenciaNum != null) selectorSearchParams.vigencia = String(vigenciaNum);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header + filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Impuesto vehicular
          </h1>
        </div>
        <div className="flex flex-col gap-2">
          <Suspense fallback={null}>
            <FiltrosImpuestos
              estadoActual={estadoActual}
              vigenciaActual={vigenciaNum}
              busquedaActual={busqueda}
            />
          </Suspense>
          {tieneFiltros && (
            <ChipsFiltrosImpuestos
              estado={estadoActual}
              vigencia={vigenciaNum}
              busqueda={busqueda || null}
              perPage={pageSize}
            />
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary/80 transition-shadow hover:shadow-lg hover:shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total registros
            </CardTitle>
            <ClipboardList className="size-5 text-primary/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{total.toLocaleString("es-CO")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tieneFiltros ? "Con filtros aplicados" : "Todos los impuestos"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary/80 transition-shadow hover:shadow-lg hover:shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En gestión
            </CardTitle>
            <Receipt className="size-5 text-primary/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{enGestion.toLocaleString("es-CO")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sin incluir pagados ni cerrados
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary/80 transition-shadow hover:shadow-lg hover:shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cobro coactivo
            </CardTitle>
            <AlertTriangle className="size-5 text-destructive/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {enCobroCoactivo.toLocaleString("es-CO")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              En proceso coactivo
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary/80 transition-shadow hover:shadow-lg hover:shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monto en gestión
            </CardTitle>
            <Wallet className="size-5 text-primary/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatMonto(montoEnGestion)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total a cobrar (COP)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Impuestos por estado</CardTitle>
            <CardDescription>
              Distribución por etapa del proceso fiscal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardGraficoEstadosImpuestos data={porEstadoOrdenado} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Impuestos por vigencia</CardTitle>
            <CardDescription>
              Cantidad por año gravable (últimas 10 vigencias)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoProcesosPorVigencia data={porVigenciaOrdenado} />
          </CardContent>
        </Card>
      </div>

      {/* Listado */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Listado</CardTitle>
            <CardDescription>
              Ordenado por fecha de creación (más recientes primero)
              {tieneFiltros && " · Filtros aplicados"}
              {" · "}
              {total.toLocaleString("es-CO")} registro{total !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/impuestos/nuevo">Nuevo impuesto</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            tieneFiltros ? (
              <EmptyState
                icon={Receipt}
                message="No hay impuestos que coincidan con los filtros aplicados."
                action={{ href: "/impuestos", label: "Limpiar filtros →" }}
              />
            ) : (
              <EmptyState
                icon={Receipt}
                message="No hay impuestos registrados. Crea uno desde el botón Nuevo impuesto."
                action={{ href: "/impuestos/nuevo", label: "Nuevo impuesto →" }}
              />
            )
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contribuyente</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Total a pagar</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[80px]">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((i) => {
                    const estado = ETIQUETAS_ESTADO[i.estadoActual] ?? {
                      label: i.estadoActual,
                      className: "bg-muted text-muted-foreground",
                    };
                    return (
                      <TableRow key={i.id}>
                        <TableCell>
                          <div className="font-medium">
                            {i.contribuyenteNombre ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {i.contribuyenteNit}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {i.placa ?? "—"}
                        </TableCell>
                        <TableCell>{i.vigencia}</TableCell>
                        <TableCell className="font-medium">
                          {i.totalAPagar != null
                            ? formatMonto(Number(i.totalAPagar))
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${estado.className}`}
                          >
                            {estado.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-primary"
                            asChild
                          >
                            <Link href={`/impuestos/${i.id}`}>
                              Ver{" "}
                              <ChevronRight className="size-4" aria-hidden />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Paginacion
                currentPage={currentPage}
                totalPages={totalPages}
                total={total}
                pageSize={pageSize}
                buildPageUrl={(p) =>
                  buildUrl({
                    q: busqueda || undefined,
                    estado: estadoActual ?? undefined,
                    vigencia: vigenciaNum,
                    perPage: pageSize,
                    page: p,
                  })
                }
                formAction="/impuestos"
                selectorSearchParams={selectorSearchParams}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
