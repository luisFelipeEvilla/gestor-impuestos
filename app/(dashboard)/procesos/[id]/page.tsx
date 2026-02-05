import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  procesos,
  impuestos,
  contribuyentes,
  usuarios,
  historialProceso,
  documentosProceso,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EliminarProcesoButton } from "./botones-proceso";
import {
  CambiarEstadoForm,
  AsignarProcesoForm,
  AgregarNotaForm,
  BotonesNotificacion,
} from "@/components/procesos/acciones-gestion";
import { ListaDocumentos } from "@/components/procesos/documentos-proceso";

type Props = { params: Promise<{ id: string }> };

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CO");
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    });
}

function labelTipoEvento(tipo: string): string {
  const map: Record<string, string> = {
    cambio_estado: "Cambio de estado",
    asignacion: "Asignación",
    nota: "Nota",
    notificacion: "Notificación",
    pago: "Pago",
  };
  return map[tipo] ?? tipo;
}

export default async function DetalleProcesoPage({ params }: Props) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [row] = await db
    .select({
      id: procesos.id,
      vigencia: procesos.vigencia,
      periodo: procesos.periodo,
      montoCop: procesos.montoCop,
      estadoActual: procesos.estadoActual,
      asignadoAId: procesos.asignadoAId,
      fechaLimite: procesos.fechaLimite,
      creadoEn: procesos.creadoEn,
      impuestoNombre: impuestos.nombre,
      impuestoCodigo: impuestos.codigo,
      contribuyenteNit: contribuyentes.nit,
      contribuyenteNombre: contribuyentes.nombreRazonSocial,
      asignadoNombre: usuarios.nombre,
    })
    .from(procesos)
    .innerJoin(impuestos, eq(procesos.impuestoId, impuestos.id))
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
    .leftJoin(usuarios, eq(procesos.asignadoAId, usuarios.id))
    .where(eq(procesos.id, id));

  if (!row) notFound();

  const [historialRows, usuariosList, documentosRows] = await Promise.all([
    db
      .select({
        id: historialProceso.id,
        tipoEvento: historialProceso.tipoEvento,
        estadoAnterior: historialProceso.estadoAnterior,
        estadoNuevo: historialProceso.estadoNuevo,
        comentario: historialProceso.comentario,
        fecha: historialProceso.fecha,
      })
      .from(historialProceso)
      .where(eq(historialProceso.procesoId, id))
      .orderBy(desc(historialProceso.fecha))
      .limit(50),
    db
      .select({ id: usuarios.id, nombre: usuarios.nombre })
      .from(usuarios)
      .where(eq(usuarios.activo, true)),
    db
      .select({
        id: documentosProceso.id,
        nombreOriginal: documentosProceso.nombreOriginal,
        mimeType: documentosProceso.mimeType,
        tamano: documentosProceso.tamano,
        creadoEn: documentosProceso.creadoEn,
      })
      .from(documentosProceso)
      .where(eq(documentosProceso.procesoId, id))
      .orderBy(desc(documentosProceso.creadoEn)),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/procesos">← Procesos</Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/procesos/${row.id}/editar`}>Editar</Link>
          </Button>
          <EliminarProcesoButton id={row.id} />
        </div>
      </div>

      <div className="grid grid-cols-4">

          <Card className="max-w-xl col-span-3">
            <CardHeader>
              <CardTitle>
                Proceso #{row.id} · {row.impuestoCodigo} – {row.contribuyenteNombre}
              </CardTitle>
              <CardDescription>
                Vigencia {row.vigencia}
                {row.periodo ? ` · Período ${row.periodo}` : ""}
                {" · "}
                Estado: <span className="capitalize">{row.estadoActual?.replace(/_/g, " ")}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <dl className="grid gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Impuesto</dt>
                  <dd className="font-medium">
                    {row.impuestoCodigo} – {row.impuestoNombre}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Contribuyente</dt>
                  <dd className="font-medium">
                    {row.contribuyenteNit} – {row.contribuyenteNombre}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Vigencia / Período</dt>
                  <dd className="font-medium">
                    {row.vigencia}
                    {row.periodo ? ` · ${row.periodo}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Monto (COP)</dt>
                  <dd className="font-medium">{Number(row.montoCop).toLocaleString("es-CO")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Estado</dt>
                  <dd className="capitalize">{row.estadoActual?.replace(/_/g, " ")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Asignado a</dt>
                  <dd>{row.asignadoNombre ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fecha límite</dt>
                  <dd>{formatDate(row.fechaLimite)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Creado</dt>
                  <dd>{formatDate(row.creadoEn)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Historial</CardTitle>
              <CardDescription>
                Registro de cambios (más recientes primero).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historialRows.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aún no hay eventos en el historial.</p>
              ) : (
                <ul className="relative pl-10 space-y-0" role="list" aria-label="Timeline del proceso">
                  <li
                    className="absolute left-[45px] top-2 bottom-2 w-px bg-border"
                    aria-hidden
                  />
                  {historialRows.map((h) => (
                    <li
                      key={h.id}
                      className="relative flex gap-3 pb-6 last:pb-0"
                    >
                      <span
                        className="bg-primary relative z-10 mt-1.5 flex h-2.5 w-2.5 shrink-0 rounded-full border-2 border-background"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1 space-y-0.5 pt-0.5">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                          <span className="font-medium text-sm">
                            {labelTipoEvento(h.tipoEvento)}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {formatDateTime(h.fecha)}
                          </span>
                        </div>
                        {(h.estadoAnterior != null || h.estadoNuevo != null) && (
                          <p className="text-muted-foreground text-xs">
                            {h.estadoAnterior != null && (
                              <span>De: {h.estadoAnterior.replace(/_/g, " ")}</span>
                            )}
                            {h.estadoAnterior != null && h.estadoNuevo != null && " → "}
                            {h.estadoNuevo != null && (
                              <span>A: {h.estadoNuevo.replace(/_/g, " ")}</span>
                            )}
                          </p>
                        )}
                        {h.comentario && (
                          <p className="text-muted-foreground text-sm">{h.comentario}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Documentos adjuntos</CardTitle>
          <CardDescription>
            Documentos vinculados a este proceso. Ábrelos en una nueva pestaña para ver o descargar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ListaDocumentos
            procesoId={row.id}
            documentos={documentosRows}
            puedeEliminar={false}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Notificación</CardTitle>
              <CardDescription>
                Primer paso después de asignar: envía la notificación al contribuyente. El estado pasará a &quot;Notificado&quot;.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BotonesNotificacion procesoId={row.id} />
            </CardContent>
          </Card>

          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Gestión del proceso</CardTitle>
              <CardDescription>
                Cambia el estado, asigna a un usuario o agrega notas. Cada acción queda registrada en el historial.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Cambiar estado</h4>
                <CambiarEstadoForm procesoId={row.id} estadoActual={row.estadoActual} />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Asignar responsable</h4>
                <AsignarProcesoForm
                  procesoId={row.id}
                  asignadoAId={row.asignadoAId}
                  usuarios={usuariosList}
                />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Agregar nota</h4>
                <AgregarNotaForm procesoId={row.id} />
              </div>
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  );
}
