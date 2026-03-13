import Link from "next/link";
import { Suspense } from "react";
import { Receipt, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { impuestos, contribuyentes } from "@/lib/db/schema";
import { eq, and, or, ilike, desc, count } from "drizzle-orm";
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
import { FiltroBusquedaImpuestos } from "./filtro-busqueda";
import { FiltroEstadoImpuestos } from "./filtro-estado";
import { parsePerPage } from "@/lib/pagination";
import { unstable_noStore } from "next/cache";

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

type Props = {
  searchParams: Promise<{ estado?: string; q?: string; page?: string; perPage?: string }>;
};

function buildUrl(params: { q?: string; estado?: string; page?: number; perPage?: number }): string {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.estado) sp.set("estado", params.estado);
  if (params.perPage != null) sp.set("perPage", String(params.perPage));
  if (params.page != null && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return s ? `/impuestos?${s}` : "/impuestos";
}

export default async function ImpuestosPage({ searchParams }: Props) {
  unstable_noStore();
  const { estado: estadoParam, q: query, page: pageParam, perPage: perPageParam } = await searchParams;
  const busqueda = (query ?? "").trim();
  const pageSize = parsePerPage(perPageParam);
  const pageRaw = pageParam ? parseInt(pageParam, 10) : 1;
  const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;

  const condiciones = [];
  if (estadoParam && estadoParam in ETIQUETAS_ESTADO) {
    condiciones.push(
      eq(
        impuestos.estadoActual,
        estadoParam as "pendiente" | "declarado" | "liquidado" | "notificado" | "en_cobro_coactivo" | "pagado" | "cerrado"
      )
    );
  }
  if (busqueda.length > 0) {
    condiciones.push(
      or(
        ilike(impuestos.tipoImpuesto, `%${busqueda}%`),
        ilike(contribuyentes.nombreRazonSocial, `%${busqueda}%`),
        ilike(contribuyentes.nit, `%${busqueda}%`),
        ilike(impuestos.noExpediente, `%${busqueda}%`)
      )
    );
  }
  const where = condiciones.length > 0 ? and(...condiciones) : undefined;

  // Total count
  const countBase = db
    .select({ count: count() })
    .from(impuestos)
    .leftJoin(contribuyentes, eq(impuestos.contribuyenteId, contribuyentes.id));
  const [countResult] = where ? await countBase.where(where) : await countBase;
  const total = Number(countResult?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;

  // Paginated data
  const listaBase = db
    .select({
      id: impuestos.id,
      tipoImpuesto: impuestos.tipoImpuesto,
      vigencia: impuestos.vigencia,
      tipoPeriodo: impuestos.tipoPeriodo,
      periodo: impuestos.periodo,
      totalAPagar: impuestos.totalAPagar,
      estadoActual: impuestos.estadoActual,
      contribuyenteNombre: contribuyentes.nombreRazonSocial,
      contribuyenteNit: contribuyentes.nit,
    })
    .from(impuestos)
    .leftJoin(contribuyentes, eq(impuestos.contribuyenteId, contribuyentes.id))
    .orderBy(desc(impuestos.creadoEn))
    .limit(pageSize)
    .offset(offset);

  const lista = where ? await listaBase.where(where) : await listaBase;

  const selectorSearchParams: Record<string, string> = {};
  if (busqueda) selectorSearchParams.q = busqueda;
  if (estadoParam) selectorSearchParams.estado = estadoParam;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Impuesto vehicular</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <FiltroBusquedaImpuestos valorActual={busqueda} estadoActual={estadoParam} />
          </Suspense>
          <FiltroEstadoImpuestos estadoActual={estadoParam} query={busqueda} />
          <Button asChild>
            <Link href="/impuestos/nuevo">Nuevo impuesto</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Impuesto vehicular</CardTitle>
          <CardDescription>
            Gestión del ciclo de vida del impuesto de vehículos automotores
            {estadoParam && ` · Estado: ${ETIQUETAS_ESTADO[estadoParam]?.label ?? estadoParam}`}
            {busqueda && " · Búsqueda aplicada"}
            {" · "}{total.toLocaleString("es-CO")} resultado{total !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <EmptyState
              icon={Receipt}
              message="No hay impuestos registrados. Crea uno desde el botón Nuevo impuesto."
              action={{ href: "/impuestos/nuevo", label: "Nuevo impuesto →" }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contribuyente</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Período</TableHead>
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
                        <div className="font-medium">{i.contribuyenteNombre ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{i.contribuyenteNit}</div>
                      </TableCell>
                      <TableCell>{i.vigencia}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {i.tipoPeriodo === "anual"
                          ? "Anual"
                          : i.periodo
                          ? `${i.tipoPeriodo.charAt(0).toUpperCase() + i.tipoPeriodo.slice(1)} ${i.periodo}`
                          : i.tipoPeriodo}
                      </TableCell>
                      <TableCell className="font-medium">
                        {i.totalAPagar != null
                          ? new Intl.NumberFormat("es-CO", {
                              style: "currency",
                              currency: "COP",
                              maximumFractionDigits: 0,
                            }).format(Number(i.totalAPagar))
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
                        <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                          <Link href={`/impuestos/${i.id}`}>
                            Ver <ChevronRight className="size-4" aria-hidden />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <Paginacion
            currentPage={currentPage}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            buildPageUrl={(p) => buildUrl({ q: busqueda || undefined, estado: estadoParam, perPage: pageSize, page: p })}
            formAction="/impuestos"
            selectorSearchParams={selectorSearchParams}
          />
        </CardContent>
      </Card>
    </div>
  );
}
