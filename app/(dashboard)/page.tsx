import Link from "next/link";
import { Suspense } from "react";
import {
  ClipboardList,
  Receipt,
  Building2,
  Users,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardGraficoEstados } from "@/components/dashboard/dashboard-grafico-estados";
import { DashboardGraficoMontoEstados } from "@/components/dashboard/dashboard-grafico-monto-estados";
import { DashboardGraficoResponsables } from "@/components/dashboard/dashboard-grafico-responsables";
import { DashboardFiltros } from "@/components/dashboard/dashboard-filtros";
import { DashboardPolling } from "@/components/dashboard/dashboard-polling";
import { SemaforoFechaLimite } from "@/components/procesos/semaforo-fecha-limite";
import { db } from "@/lib/db";
import {
  procesos,
  impuestos,
  contribuyentes,
  usuarios,
} from "@/lib/db/schema";
import { eq, desc, and, gte, lte, sql, notInArray } from "drizzle-orm";
import { unstable_noStore } from "next/cache";
import { labelEstado } from "@/lib/estados-proceso";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ESTADOS_CERRADOS = ["cobrado"] as const;

type Props = { searchParams: Promise<{ vigencia?: string }> };

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CO");
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
  const { vigencia: vigenciaParam } = await searchParams;
  const vigenciaNum =
    vigenciaParam != null && /^\d{4}$/.test(vigenciaParam)
      ? parseInt(vigenciaParam, 10)
      : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);
  const in30DaysStr = in30Days.toISOString().slice(0, 10);

  const vigenciaCond =
    vigenciaNum != null ? eq(procesos.vigencia, vigenciaNum) : undefined;
  const condProcesos = (c: ReturnType<typeof and> | ReturnType<typeof notInArray>) =>
    vigenciaCond ? and(vigenciaCond, c) : c;

  const [
    totalProcesos,
    totalImpuestos,
    totalContribuyentes,
    totalUsuarios,
    procesosPorEstado,
    montoEnGestion,
    montoPorEstado,
    procesosPorAsignado,
    vencimientosProximos,
    procesosRecientes,
  ] = await Promise.all([
    vigenciaCond
      ? db.select({ count: sql<number>`count(*)::int` }).from(procesos).where(vigenciaCond)
      : db.select({ count: sql<number>`count(*)::int` }).from(procesos),
    db.select({ count: sql<number>`count(*)::int` }).from(impuestos).where(eq(impuestos.activo, true)),
    db.select({ count: sql<number>`count(*)::int` }).from(contribuyentes),
    db.select({ count: sql<number>`count(*)::int` }).from(usuarios).where(eq(usuarios.activo, true)),
    vigenciaCond
      ? db
          .select({ estado: procesos.estadoActual, count: sql<number>`count(*)::int` })
          .from(procesos)
          .where(vigenciaCond)
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
    vigenciaCond
      ? db
          .select({
            asignadoAId: procesos.asignadoAId,
            nombre: sql<string | null>`max(${usuarios.nombre})`,
            count: sql<number>`count(*)::int`,
          })
          .from(procesos)
          .leftJoin(usuarios, eq(procesos.asignadoAId, usuarios.id))
          .where(vigenciaCond)
          .groupBy(procesos.asignadoAId)
      : db
          .select({
            asignadoAId: procesos.asignadoAId,
            nombre: sql<string | null>`max(${usuarios.nombre})`,
            count: sql<number>`count(*)::int`,
          })
          .from(procesos)
          .leftJoin(usuarios, eq(procesos.asignadoAId, usuarios.id))
          .groupBy(procesos.asignadoAId),
    db
      .select({
        id: procesos.id,
        vigencia: procesos.vigencia,
        periodo: procesos.periodo,
        estadoActual: procesos.estadoActual,
        fechaLimite: procesos.fechaLimite,
        montoCop: procesos.montoCop,
        contribuyenteNombre: contribuyentes.nombreRazonSocial,
        impuestoNombre: impuestos.nombre,
      })
      .from(procesos)
      .leftJoin(impuestos, eq(procesos.impuestoId, impuestos.id))
      .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
      .where(
        vigenciaCond
          ? and(
              gte(procesos.fechaLimite, todayStr),
              lte(procesos.fechaLimite, in30DaysStr),
              vigenciaCond
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
          impuestoNombre: impuestos.nombre,
        })
        .from(procesos)
        .leftJoin(impuestos, eq(procesos.impuestoId, impuestos.id))
        .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id));
      return (vigenciaCond ? base.where(vigenciaCond) : base)
        .orderBy(desc(procesos.creadoEn))
        .limit(5);
    })(),
  ]);

  const totalP = totalProcesos[0]?.count ?? 0;
  const totalI = totalImpuestos[0]?.count ?? 0;
  const totalC = totalContribuyentes[0]?.count ?? 0;
  const totalU = totalUsuarios[0]?.count ?? 0;
  const montoGestion = montoEnGestion[0]?.total ?? "0";

  const ordenEstados = [
    "pendiente",
    "asignado",
    "notificado",
    "en_contacto",
    "en_cobro_coactivo",
    "cobrado",
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

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      <DashboardPolling />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground text-sm pl-14">
            Resumen de procesos de cobro, vencimientos y montos en gestión (COP).
          </p>
        </div>
        <Suspense fallback={null}>
          <DashboardFiltros vigenciaActual={vigenciaNum} />
        </Suspense>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-primary/80 animate-fade-in animate-delay-1 transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/10">
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

        <Card className="border-l-4 border-l-primary/80 animate-fade-in animate-delay-2 transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/10">
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

        <Card className="border-l-4 border-l-primary/80 animate-fade-in animate-delay-3 transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Impuestos
            </CardTitle>
            <Receipt className="size-5 text-primary/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{totalI}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tipos de impuesto activos
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary/80 animate-fade-in animate-delay-4 transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contribuyentes
            </CardTitle>
            <Building2 className="size-5 text-primary/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{totalC}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personas o entidades en cartera
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary/80 animate-fade-in animate-delay-5 transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuarios
            </CardTitle>
            <Users className="size-5 text-primary/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{totalU}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Usuarios activos en la plataforma
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Procesos por estado</CardTitle>
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
            <CardTitle>Procesos por responsable</CardTitle>
            <CardDescription>
              Cantidad de procesos asignados por usuario
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
            <CardTitle>Monto en gestión por estado</CardTitle>
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
            <CardTitle>Vencimientos próximos</CardTitle>
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
                        #{p.id} · {p.impuestoNombre ?? "—"} – {p.contribuyenteNombre}
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
            <CardTitle>Procesos recientes</CardTitle>
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
                        #{p.id} · {p.impuestoNombre ?? "—"} – {p.contribuyenteNombre}
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
    </div>
  );
}
