import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import {
  procesos,
  impuestos,
  contribuyentes,
  usuarios,
} from "@/lib/db/schema";
import { eq, desc, and, gte, lte, sql, notInArray } from "drizzle-orm";

const ESTADOS_CERRADOS = ["cobrado", "incobrable"] as const;

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

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);
  const in30DaysStr = in30Days.toISOString().slice(0, 10);

  const [
    totalProcesos,
    totalImpuestos,
    totalContribuyentes,
    totalUsuarios,
    procesosPorEstado,
    montoEnGestion,
    procesosPorAsignado,
    vencimientosProximos,
    procesosRecientes,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(procesos),
    db.select({ count: sql<number>`count(*)::int` }).from(impuestos).where(eq(impuestos.activo, true)),
    db.select({ count: sql<number>`count(*)::int` }).from(contribuyentes),
    db.select({ count: sql<number>`count(*)::int` }).from(usuarios).where(eq(usuarios.activo, true)),
    db
      .select({ estado: procesos.estadoActual, count: sql<number>`count(*)::int` })
      .from(procesos)
      .groupBy(procesos.estadoActual),
    db
      .select({
        total: sql<string>`coalesce(sum(${procesos.montoCop}), 0)::text`,
      })
      .from(procesos)
      .where(notInArray(procesos.estadoActual, [...ESTADOS_CERRADOS])),
    db
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
        impuestoCodigo: impuestos.codigo,
      })
      .from(procesos)
      .innerJoin(impuestos, eq(procesos.impuestoId, impuestos.id))
      .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
      .where(
        and(
          gte(procesos.fechaLimite, todayStr),
          lte(procesos.fechaLimite, in30DaysStr)
        )
      )
      .orderBy(procesos.fechaLimite)
      .limit(10),
    db
      .select({
        id: procesos.id,
        vigencia: procesos.vigencia,
        periodo: procesos.periodo,
        estadoActual: procesos.estadoActual,
        creadoEn: procesos.creadoEn,
        contribuyenteNombre: contribuyentes.nombreRazonSocial,
        impuestoCodigo: impuestos.codigo,
      })
      .from(procesos)
      .innerJoin(impuestos, eq(procesos.impuestoId, impuestos.id))
      .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
      .orderBy(desc(procesos.creadoEn))
      .limit(5),
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
    "en_negociacion",
    "en_cobro_coactivo",
    "cobrado",
    "incobrable",
    "suspendido",
  ];
  const seen = new Set(ordenEstados);
  const procesosPorEstadoOrdenado = [
    ...ordenEstados
      .map((e) => procesosPorEstado.find((r) => r.estado === e))
      .filter((r): r is NonNullable<typeof r> => Boolean(r)),
    ...procesosPorEstado.filter((r) => r.estado != null && !seen.has(r.estado)),
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Resumen de procesos de cobro, vencimientos y montos en gestión (COP).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Procesos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalP}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total de procesos de cobro
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Impuestos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalI}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Catálogo activo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contribuyentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalC}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personas o entidades
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalU}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Administradores y empleados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monto en gestión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMonto(montoGestion)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Suma de procesos no cobrados/incobrables
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
            {procesosPorEstadoOrdenado.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No hay procesos registrados.
              </p>
            ) : (
              <ul className="space-y-2" role="list">
                {procesosPorEstadoOrdenado.map((row) => (
                  <li
                    key={row.estado}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="capitalize text-foreground">
                      {row.estado?.replace(/_/g, " ") ?? "—"}
                    </span>
                    <span className="font-semibold tabular-nums">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
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
            {procesosPorAsignado.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No hay procesos registrados.
              </p>
            ) : (
              <ul className="space-y-2" role="list">
                {procesosPorAsignado.map((row) => (
                  <li
                    key={row.asignadoAId ?? "sin-asignar"}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="text-foreground">
                      {row.nombre ?? "Sin asignar"}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
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
              <p className="text-muted-foreground text-sm">
                No hay vencimientos en los próximos 30 días.
              </p>
            ) : (
              <ul className="space-y-3" role="list">
                {vencimientosProximos.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/procesos/${p.id}`}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-border hover:bg-muted/50"
                    >
                      <span className="font-medium">
                        #{p.id} · {p.impuestoCodigo} – {p.contribuyenteNombre}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {formatDate(p.fechaLimite)}
                      </span>
                      <span className="w-full text-xs capitalize text-muted-foreground">
                        {p.estadoActual?.replace(/_/g, " ")} ·{" "}
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
                className="text-primary text-sm font-medium hover:underline"
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
              <p className="text-muted-foreground text-sm">
                No hay procesos registrados.
              </p>
            ) : (
              <ul className="space-y-3" role="list">
                {procesosRecientes.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/procesos/${p.id}`}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-border hover:bg-muted/50"
                    >
                      <span className="font-medium">
                        #{p.id} · {p.impuestoCodigo} – {p.contribuyenteNombre}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {formatDate(p.creadoEn)}
                      </span>
                      <span className="w-full text-xs capitalize text-muted-foreground">
                        {p.estadoActual?.replace(/_/g, " ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <Link
                href="/procesos"
                className="text-primary text-sm font-medium hover:underline"
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
