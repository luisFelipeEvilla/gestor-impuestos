import Link from "next/link";
import {
  obtenerCompromisosParaGestion,
  obtenerOpcionesMiembroParaFiltro,
  type FiltrosCompromisos,
} from "@/lib/actions/compromisos-acta";
import { obtenerClientesActivos } from "@/lib/actions/clientes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListChecks } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FiltrosCompromisosForm } from "./filtros-compromisos-form";
import { unstable_noStore } from "next/cache";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LABEL_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  cumplido: "Cumplido",
  no_cumplido: "No cumplido",
};

type Props = {
  searchParams: Promise<{ cliente?: string; miembro?: string }>;
};

export default async function GestionCompromisosPage({ searchParams }: Props) {
  unstable_noStore();
  const params = await searchParams;
  const clienteIdParam = params.cliente ? parseInt(params.cliente, 10) : undefined;
  const clienteId = clienteIdParam != null && !Number.isNaN(clienteIdParam) ? clienteIdParam : undefined;
  const miembro = params.miembro?.trim() || undefined;

  const filtros: FiltrosCompromisos | undefined =
    clienteId != null || miembro
      ? { ...(clienteId != null && { clienteId }), ...(miembro && { miembro }) }
      : undefined;

  const [compromisos, clientes, opcionesMiembro] = await Promise.all([
    obtenerCompromisosParaGestion(filtros),
    obtenerClientesActivos(),
    obtenerOpcionesMiembroParaFiltro(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/actas">← Actas</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Gestión de compromisos
        </h1>
        <p className="text-muted-foreground text-sm">
          Seguimiento de los compromisos pactados en las actas. Filtre por cliente o por persona asignada y actualice el estado.
        </p>
      </div>

      <FiltrosCompromisosForm
        clientes={clientes}
        opcionesMiembro={opcionesMiembro}
        clienteIdActual={clienteId}
        miembroActual={miembro}
      />

      <Card>
        <CardHeader>
          <CardTitle>Compromisos</CardTitle>
          <CardDescription>
            {compromisos.length === 0
              ? "No hay compromisos que coincidan con los filtros."
              : `${compromisos.length} compromiso(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {compromisos.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              message="No hay compromisos que mostrar con los filtros aplicados. Cambie los filtros o cree actas con compromisos."
              action={{ href: "/actas", label: "Ver actas →" }}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acta</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Fecha límite</TableHead>
                    <TableHead>Asignado a</TableHead>
                    <TableHead>Clientes</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Detalle / actualización</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compromisos.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/actas/${c.actaId}`}
                          className="text-primary hover:underline font-medium"
                        >
                          Acta #{c.actaSerial}
                        </Link>
                        <span className="text-muted-foreground text-xs block">
                          {new Date(c.actaFecha).toLocaleDateString("es-CO", {
                            dateStyle: "short",
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/actas/compromisos/${c.id}`}
                          className="text-primary hover:underline font-medium line-clamp-2 block"
                        >
                          {c.descripcion}
                        </Link>
                        <span className="text-muted-foreground text-xs block mt-0.5 line-clamp-1">
                          {c.actaObjetivo}
                        </span>
                        <Link
                          href={`/actas/compromisos/${c.id}`}
                          className="text-primary text-xs hover:underline mt-1 inline-block"
                        >
                          Ver detalle y historial →
                        </Link>
                      </TableCell>
                      <TableCell>
                        {c.fechaLimite
                          ? new Date(c.fechaLimite).toLocaleDateString("es-CO", {
                              dateStyle: "short",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {c.asignadoNombre ?? "—"}
                        {c.asignadoTipo && (
                          <span className="text-muted-foreground text-xs block">
                            {c.asignadoTipo === "interno" ? "Interno" : "Cliente"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {c.clientesNombres.length > 0
                            ? c.clientesNombres.join(", ")
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            c.estado === "cumplido"
                              ? "text-green-600 dark:text-green-400"
                              : c.estado === "no_cumplido"
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }
                        >
                          {LABEL_ESTADO[c.estado] ?? c.estado}
                        </span>
                        {c.actualizadoEn && (
                          <span className="text-muted-foreground text-xs block">
                            {new Date(c.actualizadoEn).toLocaleString("es-CO", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                            {c.actualizadoPorNombre && ` · ${c.actualizadoPorNombre}`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.detalleActualizacion ? (
                          <span className="text-sm line-clamp-2">{c.detalleActualizacion}</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
