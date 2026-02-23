import Link from "next/link";
import { Suspense } from "react";
import {
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Wallet,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  procesos,
  contribuyentes,
  usuarios,
  impuestos,
  historialProceso,
  ordenesResolucion,
} from "@/lib/db/schema";
import { asc, desc, eq, and, inArray, notInArray, sql, count } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { TablaProcesosConAsignacion } from "@/components/procesos/tabla-procesos-con-asignacion";
import { FiltrosProcesos } from "./filtros-procesos";
import { ChipsFiltrosProcesos } from "@/app/(dashboard)/procesos/chips-filtros-procesos";
import { SelectorPorPagina } from "@/components/selector-por-pagina";
import { parsePerPage } from "@/lib/pagination";
import { DashboardGraficoEstados } from "@/components/dashboard/dashboard-grafico-estados";
import { GraficoProcesosPorVigencia } from "@/components/procesos/grafico-procesos-por-vigencia";
import { unstable_noStore } from "next/cache";

function formatMonto(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ESTADOS_VALIDOS = [
  "pendiente",
  "asignado",
  "facturacion",
  "acuerdo_pago",
  "en_cobro_coactivo",
  "finalizado",
] as const;

/** Misma lógica que lib/fechas-limite (semáforo fecha límite prescripción) */
const ANTIGUEDAD_VALIDOS = [
  "en_plazo",
  "prescripcion_cercana",
  "prescripcion_muy_cercana",
  "prescrito",
  "sin_fecha",
] as const;

const ORDER_BY_VALIDOS = ["fechaLimite", "creadoEn", "montoCop", "vigencia", "estadoActual"] as const;
const ORDER_VALIDOS = ["asc", "desc"] as const;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function buildProcesosUrl(filtros: {
  estado?: string | null;
  vigencia?: number | null;
  antiguedad?: string | null;
  impuestoId?: string | null;
  asignadoId?: number | null;
  fechaAsignacion?: string | null;
  page?: number;
  perPage?: number;
  orderBy?: (typeof ORDER_BY_VALIDOS)[number];
  order?: (typeof ORDER_VALIDOS)[number];
}) {
  const search = new URLSearchParams();
  if (filtros.estado) search.set("estado", filtros.estado);
  if (filtros.vigencia != null) search.set("vigencia", String(filtros.vigencia));
  if (filtros.antiguedad && ANTIGUEDAD_VALIDOS.includes(filtros.antiguedad as (typeof ANTIGUEDAD_VALIDOS)[number]))
    search.set("antiguedad", filtros.antiguedad);
  if (filtros.impuestoId) search.set("impuesto", filtros.impuestoId);
  if (filtros.asignadoId != null && filtros.asignadoId > 0) search.set("asignado", String(filtros.asignadoId));
  if (filtros.fechaAsignacion) search.set("fechaAsignacion", filtros.fechaAsignacion);
  if (filtros.perPage != null) search.set("perPage", String(filtros.perPage));
  if (filtros.page != null && filtros.page > 1) search.set("page", String(filtros.page));
  if (filtros.orderBy && ORDER_BY_VALIDOS.includes(filtros.orderBy)) search.set("orderBy", filtros.orderBy);
  if (filtros.order && ORDER_VALIDOS.includes(filtros.order)) search.set("order", filtros.order);
  const q = search.toString();
  return q ? `/procesos?${q}` : "/procesos";
}

type Props = {
  searchParams: Promise<{
    estado?: string;
    vigencia?: string;
    antiguedad?: string;
    impuesto?: string;
    asignado?: string;
    fechaAsignacion?: string;
    page?: string;
    perPage?: string;
    orderBy?: string;
    order?: string;
  }>;
};

export default async function ProcesosPage({ searchParams }: Props) {
  unstable_noStore();
  const session = await getSession();
  const params = await searchParams;
  const estadoParam = params.estado;
  const vigenciaParam = params.vigencia;
  const impuestoParam = params.impuesto?.trim();
  const impuestoIdParam =
    impuestoParam != null && UUID_REGEX.test(impuestoParam) ? impuestoParam : null;
  const asignadoParam = params.asignado;
  const asignadoIdNum =
    asignadoParam != null && /^\d+$/.test(asignadoParam)
      ? parseInt(asignadoParam, 10)
      : null;
  const fechaAsignacionParam = params.fechaAsignacion;
  const pageParam = params.page ? Math.max(1, parseInt(params.page, 10) || 1) : 1;
  const pageSize = parsePerPage(params.perPage);

  const estadoActual: (typeof ESTADOS_VALIDOS)[number] | null =
    estadoParam != null && ESTADOS_VALIDOS.includes(estadoParam as (typeof ESTADOS_VALIDOS)[number])
      ? (estadoParam as (typeof ESTADOS_VALIDOS)[number])
      : null;
  const vigenciaNum =
    vigenciaParam != null && /^\d{4}$/.test(vigenciaParam)
      ? parseInt(vigenciaParam, 10)
      : null;
  const fechaAsignacion =
    fechaAsignacionParam != null && /^\d{4}-\d{2}-\d{2}$/.test(fechaAsignacionParam)
      ? fechaAsignacionParam
      : null;
  const antiguedadParam = params.antiguedad;
  const antiguedadActual: (typeof ANTIGUEDAD_VALIDOS)[number] | null =
    antiguedadParam != null && ANTIGUEDAD_VALIDOS.includes(antiguedadParam as (typeof ANTIGUEDAD_VALIDOS)[number])
      ? (antiguedadParam as (typeof ANTIGUEDAD_VALIDOS)[number])
      : null;
  const orderByParam = params.orderBy;
  const orderByActual: (typeof ORDER_BY_VALIDOS)[number] =
    orderByParam != null && ORDER_BY_VALIDOS.includes(orderByParam as (typeof ORDER_BY_VALIDOS)[number])
      ? (orderByParam as (typeof ORDER_BY_VALIDOS)[number])
      : "fechaLimite";
  const orderParam = params.order;
  const orderActual: (typeof ORDER_VALIDOS)[number] =
    orderParam != null && ORDER_VALIDOS.includes(orderParam as (typeof ORDER_VALIDOS)[number])
      ? (orderParam as (typeof ORDER_VALIDOS)[number])
      : orderByActual === "fechaLimite"
        ? "asc"
        : orderByActual === "creadoEn"
          ? "desc"
          : "desc";

  let idsConFechaAsignacion: number[] | null = null;
  if (fechaAsignacion != null) {
    const rows = await db
      .selectDistinct({ procesoId: historialProceso.procesoId })
      .from(historialProceso)
      .where(
        and(
          eq(historialProceso.tipoEvento, "asignacion"),
          sql`date(${historialProceso.fecha}) = ${fechaAsignacion}::date`
        )
      );
    idsConFechaAsignacion = rows.map((r) => r.procesoId);
    if (idsConFechaAsignacion.length === 0) {
      idsConFechaAsignacion = [-1];
    }
  }

  const [usuariosList, impuestosList] = await Promise.all([
    db
      .select({ id: usuarios.id, nombre: usuarios.nombre })
      .from(usuarios)
      .where(eq(usuarios.activo, true))
      .orderBy(usuarios.nombre),
    db
      .select({ id: impuestos.id, nombre: impuestos.nombre })
      .from(impuestos)
      .where(eq(impuestos.activo, true))
      .orderBy(impuestos.nombre),
  ]);
  const impuestosOptions = impuestosList.map((i) => ({
    id: i.id,
    nombre: i.nombre,
  }));

  // Empleados solo ven procesos que tienen asignados; admin ve todos; sin sesión no se ve nada.
  const condicionesSoloPermisos: ReturnType<typeof eq>[] = [];
  if (session?.user?.rol !== "admin") {
    if (!session?.user?.id) {
      condicionesSoloPermisos.push(eq(procesos.id, -1));
    } else {
      condicionesSoloPermisos.push(eq(procesos.asignadoAId, session.user.id));
    }
  }
  const whereSoloPermisos =
    condicionesSoloPermisos.length > 0 ? and(...condicionesSoloPermisos) : undefined;

  const condiciones = [];
  if (estadoActual != null) condiciones.push(eq(procesos.estadoActual, estadoActual));
  if (vigenciaNum != null) condiciones.push(eq(procesos.vigencia, vigenciaNum));
  if (impuestoIdParam != null) {
    condiciones.push(eq(procesos.impuestoId, impuestoIdParam));
  }
  if (asignadoIdNum != null) {
    condiciones.push(eq(procesos.asignadoAId, asignadoIdNum));
  }
  if (idsConFechaAsignacion != null) {
    condiciones.push(inArray(procesos.id, idsConFechaAsignacion));
  }
  if (antiguedadActual != null) {
    // Misma lógica que getSemáforoFechaLimite: 6 meses = 182 días, 12 meses = 365 días
    switch (antiguedadActual) {
      case "en_plazo":
        condiciones.push(sql`${procesos.fechaLimite} > (current_date + interval '365 days')`);
        break;
      case "prescripcion_cercana":
        condiciones.push(sql`${procesos.fechaLimite} > (current_date + interval '182 days')`);
        condiciones.push(sql`${procesos.fechaLimite} <= (current_date + interval '365 days')`);
        break;
      case "prescripcion_muy_cercana":
        condiciones.push(sql`${procesos.fechaLimite} > current_date`);
        condiciones.push(sql`${procesos.fechaLimite} <= (current_date + interval '182 days')`);
        break;
      case "prescrito":
        condiciones.push(sql`${procesos.fechaLimite} < current_date`);
        break;
      case "sin_fecha":
        condiciones.push(sql`${procesos.fechaLimite} IS NULL`);
        break;
    }
  }
  if (session?.user?.rol !== "admin") {
    if (!session?.user?.id) {
      condiciones.push(eq(procesos.id, -1));
    } else {
      condiciones.push(eq(procesos.asignadoAId, session.user.id));
    }
  }
  const whereCond =
    condiciones.length > 0 ? and(...condiciones) : undefined;

  const offset = (pageParam - 1) * pageSize;

  const baseQuery = db
    .select({
      id: procesos.id,
      contribuyenteId: procesos.contribuyenteId,
      vigencia: procesos.vigencia,
      periodo: procesos.periodo,
      noComparendo: procesos.noComparendo,
      montoCop: procesos.montoCop,
      estadoActual: procesos.estadoActual,
      numeroResolucion: ordenesResolucion.numeroResolucion,
      fechaLimite: procesos.fechaLimite,
      contribuyenteNombre: contribuyentes.nombreRazonSocial,
      contribuyenteNit: contribuyentes.nit,
      asignadoNombre: usuarios.nombre,
    })
    .from(procesos)
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
    .leftJoin(usuarios, eq(procesos.asignadoAId, usuarios.id))
    .leftJoin(ordenesResolucion, eq(procesos.id, ordenesResolucion.procesoId));

  const countQuery = db
    .select({ total: count(procesos.id) })
    .from(procesos)
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
    .leftJoin(usuarios, eq(procesos.asignadoAId, usuarios.id));

  // Mismo ámbito que el listado: filtros + permisos (así las tarjetas y gráficos responden a los filtros)
  const scopeWhere = whereCond ?? whereSoloPermisos;
  const porEstadoScopeQuery = db
    .select({ estado: procesos.estadoActual, count: sql<number>`count(${procesos.id})::int` })
    .from(procesos)
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
    .leftJoin(usuarios, eq(procesos.asignadoAId, usuarios.id))
    .where(scopeWhere)
    .groupBy(procesos.estadoActual);
  const porVigenciaScopeQuery = db
    .select({ vigencia: procesos.vigencia, count: sql<number>`count(${procesos.id})::int` })
    .from(procesos)
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
    .leftJoin(usuarios, eq(procesos.asignadoAId, usuarios.id))
    .where(scopeWhere)
    .groupBy(procesos.vigencia)
    .orderBy(desc(procesos.vigencia))
    .limit(8);
  const montoEnGestionScopeQuery = db
    .select({ total: sql<string>`coalesce(sum(${procesos.montoCop}), 0)::text` })
    .from(procesos)
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
    .leftJoin(usuarios, eq(procesos.asignadoAId, usuarios.id))
    .where(
      scopeWhere
        ? and(scopeWhere, notInArray(procesos.estadoActual, ["finalizado"]))
        : notInArray(procesos.estadoActual, ["finalizado"])
    );

  const orderDir = orderActual === "asc" ? asc : desc;
  const listQuery =
    whereCond ? baseQuery.where(whereCond) : baseQuery;
  const listWithOrder =
    orderByActual === "fechaLimite"
      ? listQuery.orderBy(orderDir(procesos.fechaLimite), desc(procesos.creadoEn))
      : orderByActual === "creadoEn"
        ? listQuery.orderBy(orderDir(procesos.creadoEn))
        : orderByActual === "montoCop"
          ? listQuery.orderBy(orderDir(procesos.montoCop), asc(procesos.fechaLimite))
          : orderByActual === "vigencia"
            ? listQuery.orderBy(orderDir(procesos.vigencia), asc(procesos.fechaLimite))
            : listQuery.orderBy(orderDir(procesos.estadoActual), asc(procesos.fechaLimite));

  const [
    countResult,
    lista,
    procesosPorEstadoScope,
    procesosPorVigenciaScope,
    montoEnGestionResult,
  ] = await Promise.all([
    scopeWhere ? countQuery.where(scopeWhere) : countQuery,
    listWithOrder.limit(pageSize).offset(offset),
    porEstadoScopeQuery,
    porVigenciaScopeQuery,
    montoEnGestionScopeQuery,
  ]);

  const total = Number(countResult[0]?.total ?? 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const page = pageParam;

  const totalProcesosScope = total;
  const montoEnGestionScope = montoEnGestionResult[0]?.total ?? "0";
  const finalizadosScope =
    procesosPorEstadoScope.find((r) => r.estado === "finalizado")?.count ?? 0;
  const enGestionScope = totalProcesosScope - finalizadosScope;

  const ordenEstados = [
    "pendiente",
    "asignado",
    "facturacion",
    "acuerdo_pago",
    "en_cobro_coactivo",
    "finalizado",
  ];
  const procesosPorEstadoOrdenado: { estado: string; count: number }[] = [];
  for (const e of ordenEstados) {
    const row = procesosPorEstadoScope.find((r) => r.estado === e);
    if (row) procesosPorEstadoOrdenado.push({ estado: row.estado, count: row.count });
  }
  const procesosPorVigenciaOrdenado = [...procesosPorVigenciaScope].reverse();

  const tieneFiltros =
    estadoActual != null ||
    vigenciaNum != null ||
    antiguedadActual != null ||
    impuestoIdParam != null ||
    (asignadoIdNum != null && asignadoIdNum > 0) ||
    fechaAsignacion != null;

  const impuestoSeleccionadoNombre =
    impuestoIdParam != null
      ? impuestosList.find((i) => i.id === impuestoIdParam)?.nombre ?? null
      : null;

  const descripcionOrden =
    orderByActual === "fechaLimite"
      ? "Fecha límite de prescripción (más urgentes primero)"
      : orderByActual === "creadoEn"
        ? orderActual === "desc"
          ? "Fecha de creación (más recientes primero)"
          : "Fecha de creación (más antiguos primero)"
        : orderByActual === "montoCop"
          ? "Monto (mayor a menor)"
          : orderByActual === "vigencia"
            ? "Vigencia"
            : "Estado";

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 ">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Procesos de cobro
          </h1>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Suspense fallback={null}>
              <FiltrosProcesos
                estadoActual={estadoActual}
                vigenciaActual={vigenciaNum}
                antiguedadActual={antiguedadActual}
                impuestoIdActual={impuestoIdParam}
                impuestos={impuestosOptions}
                usuarios={usuariosList}
                asignadoIdActual={asignadoIdNum}
                fechaAsignacionActual={fechaAsignacion}
              />
            </Suspense>
          </div>
          {tieneFiltros && (
            <ChipsFiltrosProcesos
              estado={estadoActual}
              vigencia={vigenciaNum}
              antiguedad={antiguedadActual}
              impuestoId={impuestoIdParam}
              impuestoNombre={impuestoSeleccionadoNombre}
              asignadoId={asignadoIdNum}
              asignadoNombre={asignadoIdNum != null ? usuariosList.find((u) => u.id === asignadoIdNum)?.nombre ?? null : null}
              fechaAsignacion={fechaAsignacion}
              orderBy={orderByActual}
              order={orderActual}
              perPage={pageSize}
              page={page}
            />
          )}
        </div>
        <div className="flex justify-end w-full">
          <Button asChild className="">
            <Link href="/procesos/nuevo">Nuevo proceso</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary/80 transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total procesos
            </CardTitle>
            <ClipboardList className="size-5 text-primary/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{totalProcesosScope}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              En tu ámbito de visibilidad
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary/80 transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En gestión
            </CardTitle>
            <Loader2 className="size-5 text-primary/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{enGestionScope}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pendientes de cobro
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary/80 transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Finalizados
            </CardTitle>
            <CheckCircle className="size-5 text-primary/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{finalizadosScope}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Procesos cerrados
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary/80 transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monto en gestión
            </CardTitle>
            <Wallet className="size-5 text-primary/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatMonto(montoEnGestionScope)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Suma de procesos no cobrados (COP)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Procesos por estado</CardTitle>
            <CardDescription>
              Distribución por etapa del flujo de cobro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardGraficoEstados data={procesosPorEstadoOrdenado} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Procesos por vigencia</CardTitle>
            <CardDescription>
              Cantidad por año (últimas 8 vigencias)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoProcesosPorVigencia data={procesosPorVigenciaOrdenado} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>
            {descripcionOrden}
            {tieneFiltros && " · Filtros aplicados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            tieneFiltros ? (
              <EmptyState
                icon={FolderOpen}
                message="No hay procesos que coincidan con los filtros aplicados."
                action={{ href: "/procesos", label: "Limpiar filtros →" }}
              />
            ) : (
              <EmptyState
                icon={FolderOpen}
                message="No hay procesos. Crea uno desde el botón Nuevo proceso."
                action={{ href: "/procesos/nuevo", label: "Crear proceso →" }}
              />
            )
          ) : (
            <>
              <TablaProcesosConAsignacion
                lista={lista}
                usuarios={usuariosList}
                isAdmin={session?.user?.rol === "admin"}
                orderBy={orderByActual}
                order={orderActual}
              />
              {(totalPages > 1 || total > 0) && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t pt-4 mt-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
                    </p>
                    <SelectorPorPagina
                      searchParams={{
                        ...(estadoActual ? { estado: estadoActual } : {}),
                        ...(vigenciaNum != null ? { vigencia: String(vigenciaNum) } : {}),
                        ...(antiguedadActual ? { antiguedad: antiguedadActual } : {}),
                        ...(impuestoIdParam ? { impuesto: impuestoIdParam } : {}),
                        ...(asignadoIdNum != null && asignadoIdNum > 0 ? { asignado: String(asignadoIdNum) } : {}),
                        ...(fechaAsignacion ? { fechaAsignacion } : {}),
                        perPage: String(pageSize),
                        orderBy: orderByActual,
                        order: orderActual,
                      }}
                      perPage={pageSize}
                    />
                  </div>
                  <nav className="flex flex-wrap items-center gap-2" aria-label="Paginación">
                    {page <= 1 ? (
                      <Button variant="outline" size="sm" className="gap-1 max-sm:sr-only" disabled>
                        <ChevronsLeft className="size-4" aria-hidden />
                        Primera
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1 max-sm:sr-only" asChild>
                        <Link
                          href={buildProcesosUrl({
                            estado: estadoActual ?? undefined,
                            vigencia: vigenciaNum,
                            antiguedad: antiguedadActual ?? undefined,
                            impuestoId: impuestoIdParam ?? undefined,
                            asignadoId: asignadoIdNum ?? undefined,
                            fechaAsignacion: fechaAsignacion ?? undefined,
                            perPage: pageSize,
                            page: 1,
                            orderBy: orderByActual,
                            order: orderActual,
                          })}
                          scroll={false}
                        >
                          <ChevronsLeft className="size-4" aria-hidden />
                          Primera
                        </Link>
                      </Button>
                    )}
                    {page <= 1 ? (
                      <Button variant="outline" size="sm" className="gap-1" disabled>
                        <ChevronLeft className="size-4" aria-hidden />
                        Anterior
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1" asChild>
                        <Link
                          href={buildProcesosUrl({
                            estado: estadoActual ?? undefined,
                            vigencia: vigenciaNum,
                            antiguedad: antiguedadActual ?? undefined,
                            impuestoId: impuestoIdParam ?? undefined,
                            asignadoId: asignadoIdNum ?? undefined,
                            fechaAsignacion: fechaAsignacion ?? undefined,
                            perPage: pageSize,
                            page: page - 1,
                            orderBy: orderByActual,
                            order: orderActual,
                          })}
                          scroll={false}
                        >
                          <ChevronLeft className="size-4" aria-hidden />
                          Anterior
                        </Link>
                      </Button>
                    )}
                    <span className="px-2 text-sm text-muted-foreground">
                      Página {page} de {totalPages}
                    </span>
                    {page >= totalPages ? (
                      <Button variant="outline" size="sm" className="gap-1" disabled>
                        Siguiente
                        <ChevronRight className="size-4" aria-hidden />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1" asChild>
                        <Link
                          href={buildProcesosUrl({
                            estado: estadoActual ?? undefined,
                            vigencia: vigenciaNum,
                            antiguedad: antiguedadActual ?? undefined,
                            impuestoId: impuestoIdParam ?? undefined,
                            asignadoId: asignadoIdNum ?? undefined,
                            fechaAsignacion: fechaAsignacion ?? undefined,
                            perPage: pageSize,
                            page: page + 1,
                            orderBy: orderByActual,
                            order: orderActual,
                          })}
                          scroll={false}
                        >
                          Siguiente
                          <ChevronRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    )}
                    {page >= totalPages ? (
                      <Button variant="outline" size="sm" className="gap-1 max-sm:sr-only" disabled>
                        Última
                        <ChevronsRight className="size-4" aria-hidden />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1 max-sm:sr-only" asChild>
                        <Link
                          href={buildProcesosUrl({
                            estado: estadoActual ?? undefined,
                            vigencia: vigenciaNum,
                            antiguedad: antiguedadActual ?? undefined,
                            impuestoId: impuestoIdParam ?? undefined,
                            asignadoId: asignadoIdNum ?? undefined,
                            fechaAsignacion: fechaAsignacion ?? undefined,
                            perPage: pageSize,
                            page: totalPages,
                            orderBy: orderByActual,
                            order: orderActual,
                          })}
                          scroll={false}
                        >
                          Última
                          <ChevronsRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    )}
                    <form method="GET" action="/procesos" className="flex items-center gap-1.5 max-sm:hidden">
                      {estadoActual ? <input type="hidden" name="estado" value={estadoActual} /> : null}
                      {vigenciaNum != null ? <input type="hidden" name="vigencia" value={String(vigenciaNum)} /> : null}
                      {antiguedadActual ? <input type="hidden" name="antiguedad" value={antiguedadActual} /> : null}
                      {impuestoIdParam ? <input type="hidden" name="impuesto" value={impuestoIdParam} /> : null}
                      {asignadoIdNum != null && asignadoIdNum > 0 ? <input type="hidden" name="asignado" value={String(asignadoIdNum)} /> : null}
                      {fechaAsignacion ? <input type="hidden" name="fechaAsignacion" value={fechaAsignacion} /> : null}
                      <input type="hidden" name="perPage" value={String(pageSize)} />
                      <input type="hidden" name="orderBy" value={orderByActual} />
                      <input type="hidden" name="order" value={orderActual} />
                      <label htmlFor="procesos-page-go" className="sr-only">
                        Ir a página
                      </label>
                      <Input
                        id="procesos-page-go"
                        type="number"
                        name="page"
                        min={1}
                        max={totalPages}
                        defaultValue={page}
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
