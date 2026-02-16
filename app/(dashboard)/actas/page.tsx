import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, ChevronRight, ChevronLeft, RefreshCw } from "lucide-react";
import { obtenerActas, obtenerUsuariosParaFiltroActas, obtenerAsistentesExternosParaFiltro } from "@/lib/actions/actas";
import { obtenerClientesActivos } from "@/lib/actions/clientes";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const ESTADOS: { value: string; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "pendiente_aprobacion", label: "Pendiente aprobación" },
  { value: "aprobada", label: "Aprobada" },
  { value: "enviada", label: "Enviada" },
];

interface ActasUrlParams {
  estado?: string;
  page?: number;
  cliente?: string;
  creador?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  asistenteInterno?: string;
  asistenteExterno?: string;
}

function buildActasUrl(params: ActasUrlParams) {
  const search = new URLSearchParams();
  if (params.estado) search.set("estado", params.estado);
  if (params.page != null && params.page > 1) search.set("page", String(params.page));
  if (params.cliente) search.set("cliente", params.cliente);
  if (params.creador) search.set("creador", params.creador);
  if (params.fechaDesde) search.set("fechaDesde", params.fechaDesde);
  if (params.fechaHasta) search.set("fechaHasta", params.fechaHasta);
  if (params.asistenteInterno) search.set("asistenteInterno", params.asistenteInterno);
  if (params.asistenteExterno) search.set("asistenteExterno", params.asistenteExterno);
  const q = search.toString();
  return q ? `/actas?${q}` : "/actas";
}

type Props = {
  searchParams: Promise<{
    estado?: string;
    page?: string;
    cliente?: string;
    creador?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    asistenteInterno?: string;
    asistenteExterno?: string;
  }>;
};

export default async function ActasPage({ searchParams }: Props) {
  const params = await searchParams;
  const estadoParam =
    params.estado && ESTADOS.some((e) => e.value === params.estado)
      ? params.estado
      : undefined;
  const pageParamRaw = params.page ? Math.max(1, parseInt(params.page, 10) || 1) : 1;
  const clienteParam = params.cliente?.trim() ? parseInt(params.cliente, 10) : undefined;
  const creadorParam = params.creador?.trim() ? parseInt(params.creador, 10) : undefined;
  const fechaDesdeParam = params.fechaDesde?.trim() || undefined;
  const fechaHastaParam = params.fechaHasta?.trim() || undefined;
  const asistenteInternoParam = params.asistenteInterno?.trim() ? parseInt(params.asistenteInterno, 10) : undefined;
  const asistenteExternoParam = params.asistenteExterno?.trim() || undefined;

  const [clientesList, usuariosList, asistentesExternosList, actasResult] = await Promise.all([
    obtenerClientesActivos(),
    obtenerUsuariosParaFiltroActas(),
    obtenerAsistentesExternosParaFiltro(),
    obtenerActas({
      ...(estadoParam ? { estado: estadoParam as "borrador" | "pendiente_aprobacion" | "aprobada" | "enviada" } : {}),
      page: pageParamRaw,
      ...(clienteParam != null && Number.isInteger(clienteParam) && clienteParam > 0 ? { clienteId: clienteParam } : {}),
      ...(creadorParam != null && Number.isInteger(creadorParam) && creadorParam > 0 ? { creadoPorId: creadorParam } : {}),
      ...(fechaDesdeParam ? { fechaDesde: fechaDesdeParam } : {}),
      ...(fechaHastaParam ? { fechaHasta: fechaHastaParam } : {}),
      ...(asistenteInternoParam != null && Number.isInteger(asistenteInternoParam) && asistenteInternoParam > 0 ? { integranteUsuarioId: asistenteInternoParam } : {}),
      ...(asistenteExternoParam ? { integranteExternoEmail: asistenteExternoParam } : {}),
    }),
  ]);

  const { actas: lista, total, page, pageSize, totalPages } = actasResult;

  const urlParams: ActasUrlParams = {
    estado: estadoParam,
    page,
    cliente: params.cliente,
    creador: params.creador,
    fechaDesde: fechaDesdeParam,
    fechaHasta: fechaHastaParam,
    asistenteInterno: params.asistenteInterno,
    asistenteExterno: asistenteExternoParam,
  };

  if (lista.length === 0 && total > 0 && page > totalPages) {
    redirect(buildActasUrl({ ...urlParams, page: totalPages }));
  }

  const labelEstado: Record<string, string> = {
    borrador: "Borrador",
    pendiente_aprobacion: "Pendiente aprobación",
    aprobada: "Aprobada",
    enviada: "Enviada",
  };

  const currentUrl = buildActasUrl(urlParams);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Actas de reunión
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm sr-only sm:not-sr-only">Estado:</span>
          <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted/70 p-1" role="group" aria-label="Filtrar por estado">
            <Link
              href={buildActasUrl({ ...urlParams, estado: undefined, page: 1 })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${!estadoParam ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
            >
              Todos
            </Link>
            {ESTADOS.map((e) => (
              <Link
                key={e.value}
                href={buildActasUrl({ ...urlParams, estado: e.value, page: 1 })}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${estadoParam === e.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
              >
                {e.label}
              </Link>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros</CardTitle>
            <CardDescription>
              Cliente, asistentes, fecha y creador. Aplica y usa Actualizar para refrescar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form method="get" action="/actas" className="flex flex-col gap-4">
              <input type="hidden" name="estado" value={estadoParam ?? ""} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente</Label>
                  <select
                    id="cliente"
                    name="cliente"
                    defaultValue={params.cliente ?? ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Todos</option>
                    {clientesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                        {c.codigo ? ` (${c.codigo})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creador">Creador</Label>
                  <select
                    id="creador"
                    name="creador"
                    defaultValue={params.creador ?? ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Todos</option>
                    {usuariosList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asistenteInterno">Asistente interno</Label>
                  <select
                    id="asistenteInterno"
                    name="asistenteInterno"
                    defaultValue={params.asistenteInterno ?? ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Todos</option>
                    {usuariosList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asistenteExterno">Asistente externo</Label>
                  <select
                    id="asistenteExterno"
                    name="asistenteExterno"
                    defaultValue={params.asistenteExterno ?? ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Todos</option>
                    {asistentesExternosList.map((a) => (
                      <option key={a.email} value={a.email}>
                        {a.nombre} ({a.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="fechaDesde">Fecha desde</Label>
                  <Input
                    id="fechaDesde"
                    name="fechaDesde"
                    type="date"
                    defaultValue={fechaDesdeParam ?? ""}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaHasta">Fecha hasta</Label>
                  <Input
                    id="fechaHasta"
                    name="fechaHasta"
                    type="date"
                    defaultValue={fechaHastaParam ?? ""}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" variant="secondary" size="sm">
                  Filtrar
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={currentUrl} className="gap-1.5">
                    <RefreshCw className="size-4" aria-hidden />
                    Actualizar
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex justify-end w-full gap-2">
          <Button variant="outline" asChild>
            <Link href="/actas/compromisos">Gestión de compromisos</Link>
          </Button>
          <Button asChild>
            <Link href="/actas/nuevo">Nueva acta</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>
            Actas ordenadas por fecha de creación (más recientes primero)
            {estadoParam && ` · Estado: ${labelEstado[estadoParam] ?? estadoParam}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <EmptyState
              icon={FileText}
              message="No hay actas. Crea una desde el botón Nueva acta."
              action={{ href: "/actas/nuevo", label: "Crear acta →" }}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Objetivo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Creador</TableHead>
                    <TableHead className="text-center">Integrantes</TableHead>
                    <TableHead className="w-[80px]">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>#{a.serial}</TableCell>
                      <TableCell>
                        {new Date(a.fecha).toLocaleDateString("es-CO", {
                          dateStyle: "short",
                        })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {a.objetivo}
                      </TableCell>
                      <TableCell className="capitalize">
                        {labelEstado[a.estado] ?? a.estado.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.creadorNombre ?? "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {a.numIntegrantes}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                          <Link href={`/actas/${a.id}`}>
                            Ver <ChevronRight className="size-4" aria-hidden />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t pt-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
                </p>
                {totalPages > 1 ? (
                  <nav className="flex items-center gap-1" aria-label="Paginación">
                    {page <= 1 ? (
                      <Button variant="outline" size="sm" className="gap-1" disabled>
                        <ChevronLeft className="size-4" aria-hidden />
                        Anterior
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1" asChild>
                        <Link href={buildActasUrl({ ...urlParams, page: page - 1 })}>
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
                        <Link href={buildActasUrl({ ...urlParams, page: page + 1 })}>
                          Siguiente
                          <ChevronRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    )}
                  </nav>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
