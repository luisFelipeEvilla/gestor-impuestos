import Link from "next/link";
import { Suspense } from "react";
import { ClipboardList, Wallet, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardGraficoEstados } from "@/components/dashboard/dashboard-grafico-estados";
import { DashboardGraficoEstadosActas } from "@/components/dashboard/dashboard-grafico-estados-actas";
import { DashboardGraficoMontoEstados } from "@/components/dashboard/dashboard-grafico-monto-estados";
import { DashboardGraficoResponsables } from "@/components/dashboard/dashboard-grafico-responsables";
import { DashboardFiltros } from "@/components/dashboard/dashboard-filtros";
import { DashboardPolling } from "@/components/dashboard/dashboard-polling";
import { SemaforoFechaLimite } from "@/components/procesos/semaforo-fecha-limite";
import { db } from "@/lib/db";
import { procesos, contribuyentes, usuarios, actasReunion } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, sql, notInArray, count } from "drizzle-orm";
import { unstable_noStore } from "next/cache";
import { labelEstado } from "@/lib/estados-proceso";
import { obtenerActas } from "@/lib/actions/actas";
import { cn } from "@/lib/utils";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ESTADOS_CERRADOS = ["finalizado"] as const;

const ESTADOS_VALIDOS = [
  "pendiente",
  "asignado",
  "facturacion",
  "acuerdo_pago",
  "en_cobro_coactivo",
  "finalizado",
] as const;

const TAB_VALIDOS = ["procesos", "actas"] as const;

const ESTADO_ACTA_LABEL: Record<string, string> = {
  borrador: "Borrador",
  pendiente_aprobacion: "Pendiente aprobación",
  aprobada: "Aprobada",
  enviada: "Enviada",
};

type Props = {
  searchParams: Promise<{ vigencia?: string; estado?: string; asignado?: string; tab?: string }>;
};

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CO", { timeZone: "America/Bogota" });
}

function formatMonto(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function DashboardPage({ searchParams }: Props) {
  unstable_noStore();

  const params = await searchParams;
  const tabParam = params.tab;
  const tabActual =
    tabParam != null && TAB_VALIDOS.includes(tabParam as (typeof TAB_VALIDOS)[number])
      ? (tabParam as (typeof TAB_VALIDOS)[number])
      : "procesos";

  const vigenciaNum =
    params.vigencia != null && /^\d{4}$/.test(params.vigencia)
      ? parseInt(params.vigencia, 10)
      : null;
  const estadoParam = params.estado;
  const estadoActual =
    estadoParam != null && ESTADOS_VALIDOS.includes(estadoParam as (typeof ESTADOS_VALIDOS)[number])
      ? (estadoParam as (typeof ESTADOS_VALIDOS)[number])
      : null;
  const asignadoParam = params.asignado;
  const asignadoIdNum =
    asignadoParam != null && /^\d+$/.test(asignadoParam)
      ? parseInt(asignadoParam, 10)
      : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);
  const in30DaysStr = in30Days.toISOString().slice(0, 10);

  const condiciones: ReturnType<typeof eq>[] = [];
  if (vigenciaNum != null) condiciones.push(eq(procesos.vigencia, vigenciaNum));
  if (estadoActual != null) condiciones.push(eq(procesos.estadoActual, estadoActual));
  if (asignadoIdNum != null) condiciones.push(eq(procesos.asignadoAId, asignadoIdNum));
  const baseWhere =
    condiciones.length > 0 ? and(...condiciones) : undefined;
  const condProcesos = (c: ReturnType<typeof and> | ReturnType<typeof notInArray>) =>
    baseWhere ? and(baseWhere, c) : c;

  const [
    usuariosList,
    totalProcesos,
    procesosPorEstado,
    montoEnGestion,
    montoPorEstado,
    procesosPorAsignado,
    vencimientosProximos,
    procesosRecientes,
  ] = await Promise.all([
    db
      .select({ id: usuarios.id, nombre: usuarios.nombre })
      .from(usuarios)
      .where(eq(usuarios.activo, true))
      .orderBy(usuarios.nombre),
    baseWhere
      ? db.select({ count: sql<number>`count(*)::int` }).from(procesos).where(baseWhere)
      : db.select({ count: sql<number>`count(*)::int` }).from(procesos),
    baseWhere
      ? db
          .select({ estado: procesos.estadoActual, count: sql<number>`count(*)::int` })
          .from(procesos)
          .where(baseWhere)
          .groupBy(procesos.estadoActual)
      : db
          .select({ estado: procesos.estadoActual, count: sql<number>`count(*)::int` })
          .from(procesos)
          .groupBy(procesos.estadoActual),
    db
      .select({
        total: sql<string>`coalesce(sum(${procesos.montoCop}), 0)::text`,
      })
      .from(procesos)
      .where(condProcesos(notInArray(procesos.estadoActual, [...ESTADOS_CERRADOS]))),
    db
      .select({
        estado: procesos.estadoActual,
        total: sql<string>`coalesce(sum(${procesos.montoCop}), 0)::text`,
      })
      .from(procesos)
      .where(condProcesos(notInArray(procesos.estadoActual, [...ESTADOS_CERRADOS])))
      .groupBy(procesos.estadoActual),
    baseWhere
      ? db
          .select({
            asignadoAId: procesos.asignadoAId,
            nombre: sql<string | null>`max(${usuarios.nombre})`,
            count: sql<number>`count(*)::int`,
          })
          .from(procesos)
          .leftJoin(usuarios, eq(procesos.asignadoAId, usuarios.id))
          .where(baseWhere)
          .groupBy(procesos.asignadoAId)
          .orderBy(desc(sql`count(*)::int`))
          .limit(10)
      : db
          .select({
            asignadoAId: procesos.asignadoAId,
            nombre: sql<string | null>`max(${usuarios.nombre})`,
            count: sql<number>`count(*)::int`,
          })
          .from(procesos)
          .leftJoin(usuarios, eq(procesos.asignadoAId, usuarios.id))
          .groupBy(procesos.asignadoAId)
          .orderBy(desc(sql`count(*)::int`))
          .limit(10),
    db
      .select({
        id: procesos.id,
        vigencia: procesos.vigencia,
        periodo: procesos.periodo,
        estadoActual: procesos.estadoActual,
        fechaLimite: procesos.fechaLimite,
        montoCop: procesos.montoCop,
        contribuyenteNombre: contribuyentes.nombreRazonSocial,
      })
      .from(procesos)
      .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
      .where(
        baseWhere
          ? and(
              gte(procesos.fechaLimite, todayStr),
              lte(procesos.fechaLimite, in30DaysStr),
              baseWhere
            )
          : and(
              gte(procesos.fechaLimite, todayStr),
              lte(procesos.fechaLimite, in30DaysStr)
            )
      )
      .orderBy(procesos.fechaLimite)
      .limit(10),
    (() => {
      const base = db
        .select({
          id: procesos.id,
          vigencia: procesos.vigencia,
          periodo: procesos.periodo,
          estadoActual: procesos.estadoActual,
          creadoEn: procesos.creadoEn,
          contribuyenteNombre: contribuyentes.nombreRazonSocial,
        })
        .from(procesos)
        .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id));
      return (baseWhere ? base.where(baseWhere) : base)
        .orderBy(desc(procesos.creadoEn))
        .limit(5);
    })(),
  ]);

  const totalP = totalProcesos[0]?.count ?? 0;
  const montoGestion = montoEnGestion[0]?.total ?? "0";

  const ordenEstados = [
    "pendiente",
    "asignado",
    "facturacion",
    "acuerdo_pago",
    "en_cobro_coactivo",
    "finalizado",
  ];
  const seen = new Set(ordenEstados);
  const procesosPorEstadoOrdenado = [
    ...ordenEstados
      .map((e) => procesosPorEstado.find((r) => r.estado === e))
      .filter((r): r is NonNullable<typeof r> => Boolean(r)),
    ...procesosPorEstado.filter((r) => r.estado != null && !seen.has(r.estado)),
  ];

  const montoPorEstadoOrdenado: { estado: string; total: number }[] = [];
  for (const e of ordenEstados) {
    const row = montoPorEstado.find((r) => r.estado === e);
    if (row && Number(row.total) > 0) {
      montoPorEstadoOrdenado.push({ estado: row.estado, total: Number(row.total) });
    }
  }
  for (const r of montoPorEstado) {
    if (r.estado != null && !ordenEstados.includes(r.estado) && Number(r.total) > 0) {
      montoPorEstadoOrdenado.push({ estado: r.estado, total: Number(r.total) });
    }
  }

  const [actasResult, actasPorEstadoRaw] =
    tabActual === "actas"
      ? await Promise.all([
          obtenerActas({ page: 1, pageSize: 5 }),
          db
            .select({
              estado: actasReunion.estado,
              count: count(actasReunion.id),
            })
            .from(actasReunion)
            .groupBy(actasReunion.estado),
        ])
      : [null, []];
  const totalActas = actasResult?.total ?? 0;
  const actasRecientes = actasResult?.actas ?? [];
  const ordenEstadosActa = ["borrador", "pendiente_aprobacion", "aprobada", "enviada"] as const;
  type EstadoActaCount = { estado: (typeof ordenEstadosActa)[number]; count: number };
  const actasPorEstadoOrdenado = ordenEstadosActa
    .map((e) => actasPorEstadoRaw.find((r) => r.estado === e))
    .filter((r): r is EstadoActaCount => Boolean(r))
    .map((r) => ({ estado: r.estado, count: Number(r.count) }));

  const searchBase = new URLSearchParams();
  if (vigenciaNum != null) searchBase.set("vigencia", String(vigenciaNum));
  if (estadoActual != null) searchBase.set("estado", estadoActual);
  if (asignadoIdNum != null && asignadoIdNum > 0) searchBase.set("asignado", String(asignadoIdNum));
  searchBase.set("tab", "procesos");
  const urlProcesos = `/?${searchBase.toString()}`;
  const urlActas = "/?tab=actas";

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      <DashboardPolling />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            {vigenciaNum != null && (
              <Badge variant="secondary" className="font-normal">
                Vigencia {vigenciaNum}
              </Badge>
            )}
            {estadoActual != null && (
              <Badge variant="secondary" className="font-normal">
                {labelEstado(estadoActual)}
              </Badge>
            )}
            {asignadoIdNum != null && (
              <Badge variant="secondary" className="font-normal">
                {usuariosList.find((u) => u.id === asignadoIdNum)?.nombre ?? `Asignado #${asignadoIdNum}`}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm pl-14">
            {tabActual === "procesos"
              ? "Resumen de procesos de cobro, vencimientos y montos en gestión (COP)."
              : "Resumen de actas de reunión."}
          </p>
        </div>
      </div>

      <nav
        className="flex border-b border-border"
        aria-label="Secciones del dashboard"
      >
        <Link
          href={urlProcesos}
          className={cn(
            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
            tabActual === "procesos"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          Procesos
        </Link>
        <Link
          href={urlActas}
          className={cn(
            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
            tabActual === "actas"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          Actas
        </Link>
      </nav>

      {tabActual === "procesos" && (
        <>
      {totalP === 0 && vigenciaNum == null && estadoActual == null && asignadoIdNum == null && (
        <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-4 text-center">
          <p className="text-muted-foreground text-sm">
            No hay procesos de cobro.{" "}
            <Link
              href="/procesos"
              className="text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              Crea uno desde Procesos
            </Link>
            .
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/procesos"
          className="block rounded-2xl transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Ver procesos de cobro"
        >
          <Card className="border-l-4 border-l-primary/80 animate-fade-in animate-delay-1 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Procesos
              </CardTitle>
              <ClipboardList className="size-5 text-primary/70" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{totalP}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total de procesos de cobro
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link
          href="/procesos"
          className="block rounded-2xl transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Ver procesos en gestión"
        >
          <Card className="border-l-4 border-l-primary/80 animate-fade-in animate-delay-2 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monto en gestión
              </CardTitle>
              <Wallet className="size-5 text-primary/70" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{formatMonto(montoGestion)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Suma de procesos no cobrados
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <section className="space-y-3" aria-label="Filtros del dashboard">
        <h2 className="text-sm font-medium text-muted-foreground">
          Filtros
        </h2>
        <Suspense fallback={null}>
          <DashboardFiltros
            vigenciaActual={vigenciaNum}
            estadoActual={estadoActual}
            asignadoIdActual={asignadoIdNum}
            usuarios={usuariosList}
          />
        </Suspense>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              Procesos por estado
            </h2>
            <CardDescription>
              Distribución actual de estados del flujo de cobro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardGraficoEstados data={procesosPorEstadoOrdenado} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              Procesos por responsable
            </h2>
            <CardDescription>
              Top 10 responsables por cantidad de procesos asignados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardGraficoResponsables
              data={procesosPorAsignado.map((r) => ({
                nombre: r.nombre ?? "Sin asignar",
                count: r.count,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              Monto en gestión por estado
            </h2>
            <CardDescription>
              Suma de montos (COP) por estado, excluyendo cobrado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardGraficoMontoEstados data={montoPorEstadoOrdenado} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              Vencimientos próximos
            </h2>
            <CardDescription>
              Procesos con fecha límite en los próximos 30 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vencimientosProximos.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <div className="rounded-full bg-muted p-3" aria-hidden>
                  <ClipboardList className="size-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm max-w-[240px]">
                  No hay vencimientos en los próximos 30 días.
                </p>
              </div>
            ) : (
              <ul className="space-y-3" role="list">
                {vencimientosProximos.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/procesos/${p.id}`}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-transparent px-3 py-2.5 text-sm transition-colors hover:border-border hover:bg-accent/50"
                    >
                      <span className="font-medium text-foreground">
                        #{p.id} – {p.contribuyenteNombre}
                      </span>
                      <span className="flex items-center gap-2">
                        <SemaforoFechaLimite fechaLimite={p.fechaLimite} variant="pill" />
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {formatDate(p.fechaLimite)}
                        </span>
                      </span>
                      <span className="w-full text-xs capitalize text-muted-foreground">
                        {labelEstado(p.estadoActual)} ·{" "}
                        {formatMonto(p.montoCop)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <Link
                href="/procesos"
                className="text-primary text-sm font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
              >
                Ver todos los procesos →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              Procesos recientes
            </h2>
            <CardDescription>
              Últimos procesos creados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {procesosRecientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <div className="rounded-full bg-muted p-3" aria-hidden>
                  <ClipboardList className="size-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm max-w-[240px]">
                  No hay procesos registrados.
                </p>
              </div>
            ) : (
              <ul className="space-y-3" role="list">
                {procesosRecientes.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/procesos/${p.id}`}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-transparent px-3 py-2.5 text-sm transition-colors hover:border-border hover:bg-accent/50"
                    >
                      <span className="font-medium text-foreground">
                        #{p.id} – {p.contribuyenteNombre}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {formatDate(p.creadoEn)}
                      </span>
                      <span className="w-full text-xs capitalize text-muted-foreground">
                        {labelEstado(p.estadoActual)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <Link
                href="/procesos"
                className="text-primary text-sm font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
              >
                Ver todos los procesos →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}

      {tabActual === "actas" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/actas"
              className="block rounded-2xl transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Ver actas de reunión"
            >
              <Card className="border-l-4 border-l-primary/80 h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Actas
                  </CardTitle>
                  <FileText className="size-5 text-primary/70" aria-hidden />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{totalActas}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Total de actas de reunión
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                Actas por estado
              </h2>
              <CardDescription>
                Distribución por estado del acta (borrador, pendiente aprobación, aprobada, enviada)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardGraficoEstadosActas data={actasPorEstadoOrdenado} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                Actas recientes
              </h2>
              <CardDescription>
                Últimas actas creadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actasRecientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                  <div className="rounded-full bg-muted p-3" aria-hidden>
                    <FileText className="size-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm max-w-[240px]">
                    No hay actas registradas.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3" role="list">
                  {actasRecientes.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/actas/${a.id}`}
                        className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-transparent px-3 py-2.5 text-sm transition-colors hover:border-border hover:bg-accent/50"
                      >
                        <span className="font-medium text-foreground">
                          Acta #{a.serial} – {a.objetivo}
                        </span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {formatDate(a.fecha)}
                        </span>
                        <span className="w-full text-xs text-muted-foreground">
                          {ESTADO_ACTA_LABEL[a.estado] ?? a.estado}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3">
                <Link
                  href="/actas"
                  className="text-primary text-sm font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
                >
                  Ver todas las actas →
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
