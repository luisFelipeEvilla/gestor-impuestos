import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, ChevronRight, ChevronLeft } from "lucide-react";
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
import { FiltrosActasForm } from "./filtros-actas-form";

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

function parseArrayParam(
  p: string | string[] | undefined
): string[] {
  if (!p) return [];
  if (Array.isArray(p)) return p.map((s) => String(s).trim()).filter(Boolean);
  return String(p)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

type Props = {
  searchParams: Promise<{
    estado?: string;
    page?: string;
    cliente?: string;
    creador?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    asistenteInterno?: string | string[];
    asistenteExterno?: string | string[];
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
  const asistenteInternoRaw = parseArrayParam(params.asistenteInterno);
  const asistenteExternoRaw = parseArrayParam(params.asistenteExterno);
  const asistenteInternoIds = asistenteInternoRaw
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n > 0);
  const asistenteExternoEmails = asistenteExternoRaw.filter((s) => s.length > 0);

  const [clientesList, usuariosList, asistentesExternosList, actasResult] = await Promise.all([
    obtenerClientesActivos(),
    obtenerUsuariosParaFiltroActas(),
    obtenerAsistentesExternosParaFiltro(clienteParam),
    obtenerActas({
      ...(estadoParam ? { estado: estadoParam as "borrador" | "pendiente_aprobacion" | "aprobada" | "enviada" } : {}),
      page: pageParamRaw,
      ...(clienteParam != null && Number.isInteger(clienteParam) && clienteParam > 0 ? { clienteId: clienteParam } : {}),
      ...(creadorParam != null && Number.isInteger(creadorParam) && creadorParam > 0 ? { creadoPorId: creadorParam } : {}),
      ...(fechaDesdeParam ? { fechaDesde: fechaDesdeParam } : {}),
      ...(fechaHastaParam ? { fechaHasta: fechaHastaParam } : {}),
      ...(asistenteInternoIds.length > 0 ? { integranteUsuarioIds: asistenteInternoIds } : {}),
      ...(asistenteExternoEmails.length > 0 ? { integranteExternoEmails: asistenteExternoEmails } : {}),
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
    asistenteInterno: asistenteInternoRaw.length > 0 ? asistenteInternoRaw.join(",") : undefined,
    asistenteExterno: asistenteExternoRaw.length > 0 ? asistenteExternoRaw.join(",") : undefined,
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
              Cliente, asistentes (múltiples), fecha y creador. Si eliges un cliente, los asistentes externos se limitan a ese cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FiltrosActasForm
              estadoParam={estadoParam ?? ""}
              clientesList={clientesList}
              usuariosList={usuariosList}
              initialExternos={asistentesExternosList}
              initialCliente={params.cliente ?? ""}
              initialCreador={params.creador ?? ""}
              initialAsistenteInterno={asistenteInternoRaw}
              initialAsistenteExterno={asistenteExternoRaw}
              initialFechaDesde={fechaDesdeParam ?? ""}
              initialFechaHasta={fechaHastaParam ?? ""}
              currentUrl={currentUrl}
            />
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
