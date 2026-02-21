import Link from "next/link";
import { Suspense } from "react";
import { FolderOpen, ChevronRight, ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import {
  procesos,
  impuestos,
  contribuyentes,
  usuarios,
  historialProceso,
  ordenesResolucion,
} from "@/lib/db/schema";
import { asc, desc, eq, and, or, ilike, inArray, sql, count } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TablaProcesosConAsignacion } from "@/components/procesos/tabla-procesos-con-asignacion";
import { FiltrosProcesos } from "./filtros-procesos";
import { unstable_noStore } from "next/cache";

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

function buildProcesosUrl(filtros: {
  estado?: string | null;
  vigencia?: number | null;
  contribuyente?: string;
  asignadoId?: number | null;
  fechaAsignacion?: string | null;
  impuestoId?: string | null;
  page?: number;
}) {
  const search = new URLSearchParams();
  if (filtros.estado) search.set("estado", filtros.estado);
  if (filtros.vigencia != null) search.set("vigencia", String(filtros.vigencia));
  if (filtros.contribuyente?.trim()) search.set("contribuyente", filtros.contribuyente.trim());
  if (filtros.asignadoId != null && filtros.asignadoId > 0) search.set("asignado", String(filtros.asignadoId));
  if (filtros.fechaAsignacion) search.set("fechaAsignacion", filtros.fechaAsignacion);
  if (filtros.impuestoId) search.set("impuesto", filtros.impuestoId);
  if (filtros.page != null && filtros.page > 1) search.set("page", String(filtros.page));
  const q = search.toString();
  return q ? `/procesos?${q}` : "/procesos";
}

type Props = {
  searchParams: Promise<{
    estado?: string;
    vigencia?: string;
    contribuyente?: string;
    asignado?: string;
    fechaAsignacion?: string;
    impuesto?: string;
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
  const impuestoParam = params.impuesto?.trim();
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
  const impuestoIdStr =
    impuestoParam != null && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(impuestoParam)
      ? impuestoParam
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

  const impuestosQuery = db
    .selectDistinct({ id: impuestos.id, nombre: impuestos.nombre })
    .from(impuestos)
    .innerJoin(procesos, eq(procesos.impuestoId, impuestos.id));
  const impuestosConProcesos =
    session?.user?.rol !== "admin" && session?.user?.id != null
      ? await impuestosQuery.where(eq(procesos.asignadoAId, session.user.id)).orderBy(impuestos.nombre)
      : await impuestosQuery.orderBy(impuestos.nombre);

  const usuariosList = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre })
    .from(usuarios)
    .where(eq(usuarios.activo, true))
    .orderBy(usuarios.nombre);

  const condiciones = [];
  if (estadoActual != null) condiciones.push(eq(procesos.estadoActual, estadoActual));
  if (vigenciaNum != null) condiciones.push(eq(procesos.vigencia, vigenciaNum));
  if (impuestoIdStr != null) condiciones.push(eq(procesos.impuestoId, impuestoIdStr));
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
  if (idsConFechaAsignacion != null) {
    condiciones.push(inArray(procesos.id, idsConFechaAsignacion));
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
      vigencia: procesos.vigencia,
      periodo: procesos.periodo,
      noComparendo: procesos.noComparendo,
      montoCop: procesos.montoCop,
      estadoActual: procesos.estadoActual,
      numeroResolucion: ordenesResolucion.numeroResolucion,
      fechaLimite: procesos.fechaLimite,
      impuestoNombre: impuestos.nombre,
      contribuyenteNombre: contribuyentes.nombreRazonSocial,
      contribuyenteNit: contribuyentes.nit,
      asignadoNombre: usuarios.nombre,
    })
    .from(procesos)
    .innerJoin(impuestos, eq(procesos.impuestoId, impuestos.id))
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
    .leftJoin(usuarios, eq(procesos.asignadoAId, usuarios.id))
    .leftJoin(ordenesResolucion, eq(procesos.id, ordenesResolucion.procesoId));

  const countQuery = db
    .select({ total: count(procesos.id) })
    .from(procesos)
    .innerJoin(impuestos, eq(procesos.impuestoId, impuestos.id))
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
    .leftJoin(usuarios, eq(procesos.asignadoAId, usuarios.id));

  const [countResult, lista] = await Promise.all([
    whereCond ? countQuery.where(whereCond) : countQuery,
    (whereCond ? baseQuery.where(whereCond) : baseQuery)
      .orderBy(asc(procesos.fechaLimite), desc(procesos.creadoEn))
      .limit(pageSize)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.total ?? 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const page = pageParam;

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
              contribuyenteActual={contribuyenteQ}
              usuarios={usuariosList}
              asignadoIdActual={asignadoIdNum}
              fechaAsignacionActual={fechaAsignacion}
              impuestos={impuestosConProcesos}
              impuestoIdActual={impuestoIdStr}
            />
          </Suspense>
        </div>
        <div className="flex justify-end w-full">
          <Button asChild className="">
            <Link href="/procesos/nuevo">Nuevo proceso</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>
            Procesos ordenados por fecha de creación (más recientes primero)
            {(estadoActual != null ||
              vigenciaNum != null ||
              contribuyenteQ.length > 0 ||
              asignadoIdNum != null ||
              fechaAsignacion != null ||
              impuestoIdStr != null) && " · Filtros aplicados"}
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
                  <nav className="flex items-center gap-1" aria-label="Paginación">
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
                            contribuyente: contribuyenteQ || undefined,
                            asignadoId: asignadoIdNum ?? undefined,
                            fechaAsignacion: fechaAsignacion ?? undefined,
                            impuestoId: impuestoIdStr ?? undefined,
                            page: page - 1,
                          })}
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
                            contribuyente: contribuyenteQ || undefined,
                            asignadoId: asignadoIdNum ?? undefined,
                            fechaAsignacion: fechaAsignacion ?? undefined,
                            impuestoId: impuestoIdStr ?? undefined,
                            page: page + 1,
                          })}
                        >
                          Siguiente
                          <ChevronRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    )}
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
