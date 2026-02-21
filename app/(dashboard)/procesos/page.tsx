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
  historialProceso,
  ordenesResolucion,
} from "@/lib/db/schema";
import { asc, desc, eq, and, or, ilike, inArray, sql, count, notInArray } from "drizzle-orm";
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
  "notificado",
  "en_contacto",
  "en_cobro_coactivo",
  "cobrado",
] as const;

const PROCESOS_PAGE_SIZE = 15;

const ANTIGUEDAD_VALIDOS = ["menos_30", "30_90", "90_180", "mas_180"] as const;

function buildProcesosUrl(filtros: {
  estado?: string | null;
  vigencia?: number | null;
  antiguedad?: string | null;
  contribuyente?: string;
  asignadoId?: number | null;
  fechaAsignacion?: string | null;
  comparendo?: string | null;
  page?: number;
}) {
  const search = new URLSearchParams();
  if (filtros.estado) search.set("estado", filtros.estado);
  if (filtros.vigencia != null) search.set("vigencia", String(filtros.vigencia));
  if (filtros.antiguedad && ANTIGUEDAD_VALIDOS.includes(filtros.antiguedad as (typeof ANTIGUEDAD_VALIDOS)[number]))
    search.set("antiguedad", filtros.antiguedad);
  if (filtros.contribuyente?.trim()) search.set("contribuyente", filtros.contribuyente.trim());
  if (filtros.asignadoId != null && filtros.asignadoId > 0) search.set("asignado", String(filtros.asignadoId));
  if (filtros.fechaAsignacion) search.set("fechaAsignacion", filtros.fechaAsignacion);
  if (filtros.comparendo?.trim()) search.set("comparendo", filtros.comparendo.trim());
  if (filtros.page != null && filtros.page > 1) search.set("page", String(filtros.page));
  const q = search.toString();
  return q ? `/procesos?${q}` : "/procesos";
}

type Props = {
  searchParams: Promise<{
    estado?: string;
    vigencia?: string;
    antiguedad?: string;
    contribuyente?: string;
    asignado?: string;
    fechaAsignacion?: string;
    comparendo?: string;
    page?: string;
  }>;
};

export default async function ProcesosPage({ searchParams }: Props) {
  unstable_noStore();
  const session = await getSession();
  const params = await searchParams;
  const estadoParam = params.estado;
  const vigenciaParam = params.vigencia;
  const contribuyenteQ = (params.contribuyente ?? "").trim();
  const asignadoParam = params.asignado;
  const asignadoIdNum =
    asignadoParam != null && /^\d+$/.test(asignadoParam)
      ? parseInt(asignadoParam, 10)
      : null;
  const fechaAsignacionParam = params.fechaAsignacion;
  const comparendoQ = (params.comparendo ?? "").trim();
  const pageParam = params.page ? Math.max(1, parseInt(params.page, 10) || 1) : 1;

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

  const usuariosList = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre })
    .from(usuarios)
    .where(eq(usuarios.activo, true))
    .orderBy(usuarios.nombre);

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
  if (contribuyenteQ.length > 0) {
    condiciones.push(
      or(
        ilike(contribuyentes.nombreRazonSocial, `%${contribuyenteQ}%`),
        ilike(contribuyentes.nit, `%${contribuyenteQ}%`)
      )
    );
  }
  if (asignadoIdNum != null) {
    condiciones.push(eq(procesos.asignadoAId, asignadoIdNum));
  }
  if (comparendoQ.length > 0) {
    condiciones.push(ilike(procesos.noComparendo, `%${comparendoQ}%`));
  }
  if (idsConFechaAsignacion != null) {
    condiciones.push(inArray(procesos.id, idsConFechaAsignacion));
  }
  if (antiguedadActual != null) {
    switch (antiguedadActual) {
      case "menos_30":
        condiciones.push(sql`${procesos.creadoEn} >= (now() - interval '30 days')`);
        break;
      case "30_90":
        condiciones.push(sql`${procesos.creadoEn} < (now() - interval '30 days')`);
        condiciones.push(sql`${procesos.creadoEn} >= (now() - interval '90 days')`);
        break;
      case "90_180":
        condiciones.push(sql`${procesos.creadoEn} < (now() - interval '90 days')`);
        condiciones.push(sql`${procesos.creadoEn} >= (now() - interval '180 days')`);
        break;
      case "mas_180":
        condiciones.push(sql`${procesos.creadoEn} < (now() - interval '180 days')`);
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

  const pageSize = PROCESOS_PAGE_SIZE;
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

  const totalScopeQuery = db
    .select({ count: sql<number>`count(*)::int` })
    .from(procesos)
    .where(whereSoloPermisos);
  const porEstadoScopeQuery = db
    .select({ estado: procesos.estadoActual, count: sql<number>`count(*)::int` })
    .from(procesos)
    .where(whereSoloPermisos)
    .groupBy(procesos.estadoActual);
  const porVigenciaScopeQuery = db
    .select({ vigencia: procesos.vigencia, count: sql<number>`count(*)::int` })
    .from(procesos)
    .where(whereSoloPermisos)
    .groupBy(procesos.vigencia)
    .orderBy(desc(procesos.vigencia))
    .limit(8);
  const montoEnGestionScopeQuery = db
    .select({ total: sql<string>`coalesce(sum(${procesos.montoCop}), 0)::text` })
    .from(procesos)
    .where(
      whereSoloPermisos
        ? and(whereSoloPermisos, notInArray(procesos.estadoActual, ["cobrado"]))
        : notInArray(procesos.estadoActual, ["cobrado"])
    );

  const [
    countResult,
    lista,
    totalScopeResult,
    procesosPorEstadoScope,
    procesosPorVigenciaScope,
    montoEnGestionResult,
  ] = await Promise.all([
    whereCond ? countQuery.where(whereCond) : countQuery,
    (whereCond ? baseQuery.where(whereCond) : baseQuery)
      .orderBy(asc(procesos.fechaLimite), desc(procesos.creadoEn))
      .limit(pageSize)
      .offset(offset),
    totalScopeQuery,
    porEstadoScopeQuery,
    porVigenciaScopeQuery,
    montoEnGestionScopeQuery,
  ]);

  const total = Number(countResult[0]?.total ?? 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const page = pageParam;

  const totalProcesosScope = totalScopeResult[0]?.count ?? 0;
  const montoEnGestionScope = montoEnGestionResult[0]?.total ?? "0";
  const cobradosScope =
    procesosPorEstadoScope.find((r) => r.estado === "cobrado")?.count ?? 0;
  const enGestionScope = totalProcesosScope - cobradosScope;

  const ordenEstados = [
    "pendiente",
    "asignado",
    "notificado",
    "en_contacto",
    "en_cobro_coactivo",
    "cobrado",
  ];
  const procesosPorEstadoOrdenado: { estado: string; count: number }[] = [];
  for (const e of ordenEstados) {
    const row = procesosPorEstadoScope.find((r) => r.estado === e);
    if (row) procesosPorEstadoOrdenado.push({ estado: row.estado, count: row.count });
  }
  const procesosPorVigenciaOrdenado = [...procesosPorVigenciaScope].reverse();

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 ">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Procesos de cobro
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <FiltrosProcesos
              estadoActual={estadoActual}
              vigenciaActual={vigenciaNum}
              antiguedadActual={antiguedadActual}
              contribuyenteActual={contribuyenteQ}
              comparendoActual={comparendoQ}
              usuarios={usuariosList}
              asignadoIdActual={asignadoIdNum}
              fechaAsignacionActual={fechaAsignacion}
            />
          </Suspense>
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
              Cobrados
            </CardTitle>
            <CheckCircle className="size-5 text-primary/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{cobradosScope}</p>
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
            Procesos ordenados por fecha de creación (más recientes primero)
            {(estadoActual != null ||
              vigenciaNum != null ||
              contribuyenteQ.length > 0 ||
              comparendoQ.length > 0 ||
              asignadoIdNum != null ||
              fechaAsignacion != null) && " · Filtros aplicados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              message="No hay procesos. Crea uno desde el botón Nuevo proceso."
              action={{ href: "/procesos/nuevo", label: "Crear proceso →" }}
            />
          ) : (
            <>
              <TablaProcesosConAsignacion
                lista={lista}
                usuarios={usuariosList}
                isAdmin={session?.user?.rol === "admin"}
              />
              {totalPages > 1 && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t pt-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
                  </p>
                  <nav className="flex flex-wrap items-center gap-2" aria-label="Paginación">
                    {page <= 1 ? (
                      <Button variant="outline" size="sm" className="gap-1" disabled>
                        <ChevronsLeft className="size-4" aria-hidden />
                        Primera
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1" asChild>
                        <Link
                          href={buildProcesosUrl({
                            estado: estadoActual ?? undefined,
                            vigencia: vigenciaNum,
                            antiguedad: antiguedadActual ?? undefined,
                            contribuyente: contribuyenteQ || undefined,
                            comparendo: comparendoQ || undefined,
                            asignadoId: asignadoIdNum ?? undefined,
                            fechaAsignacion: fechaAsignacion ?? undefined,
                            page: 1,
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
                            contribuyente: contribuyenteQ || undefined,
                            comparendo: comparendoQ || undefined,
                            asignadoId: asignadoIdNum ?? undefined,
                            fechaAsignacion: fechaAsignacion ?? undefined,
                            page: page - 1,
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
                            contribuyente: contribuyenteQ || undefined,
                            comparendo: comparendoQ || undefined,
                            asignadoId: asignadoIdNum ?? undefined,
                            fechaAsignacion: fechaAsignacion ?? undefined,
                            page: page + 1,
                          })}
                          scroll={false}
                        >
                          Siguiente
                          <ChevronRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    )}
                    {page >= totalPages ? (
                      <Button variant="outline" size="sm" className="gap-1" disabled>
                        Última
                        <ChevronsRight className="size-4" aria-hidden />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1" asChild>
                        <Link
                          href={buildProcesosUrl({
                            estado: estadoActual ?? undefined,
                            vigencia: vigenciaNum,
                            antiguedad: antiguedadActual ?? undefined,
                            contribuyente: contribuyenteQ || undefined,
                            comparendo: comparendoQ || undefined,
                            asignadoId: asignadoIdNum ?? undefined,
                            fechaAsignacion: fechaAsignacion ?? undefined,
                            page: totalPages,
                          })}
                          scroll={false}
                        >
                          Última
                          <ChevronsRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    )}
                    <form method="GET" action="/procesos" className="flex items-center gap-1.5">
                      {estadoActual ? <input type="hidden" name="estado" value={estadoActual} /> : null}
                      {vigenciaNum != null ? <input type="hidden" name="vigencia" value={String(vigenciaNum)} /> : null}
                      {contribuyenteQ ? <input type="hidden" name="contribuyente" value={contribuyenteQ} /> : null}
                      {comparendoQ ? <input type="hidden" name="comparendo" value={comparendoQ} /> : null}
                      {asignadoIdNum != null && asignadoIdNum > 0 ? <input type="hidden" name="asignado" value={String(asignadoIdNum)} /> : null}
                      {fechaAsignacion ? <input type="hidden" name="fechaAsignacion" value={fechaAsignacion} /> : null}
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
