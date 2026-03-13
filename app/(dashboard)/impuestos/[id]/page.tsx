import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { impuestos, contribuyentes, historialImpuesto, usuarios } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  EliminarImpuestoButton,
  CambiarEstadoImpuestoButton,
  AgregarNotaButton,
} from "./botones-impuesto";
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

const ETIQUETAS_PERIODO: Record<string, string> = {
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

const ETIQUETAS_EVENTO: Record<string, string> = {
  cambio_estado: "Cambio de estado",
  asignacion: "Asignación",
  nota: "Nota",
};

type Props = { params: Promise<{ id: string }> };

export default async function DetalleImpuestoPage({ params }: Props) {
  unstable_noStore();
  const { id } = await params;
  const idTrim = id?.trim();
  if (!idTrim || idTrim.length < 30) notFound();

  const [row] = await db
    .select({
      id: impuestos.id,
      tipoImpuesto: impuestos.tipoImpuesto,
      vigencia: impuestos.vigencia,
      tipoPeriodo: impuestos.tipoPeriodo,
      periodo: impuestos.periodo,
      baseGravable: impuestos.baseGravable,
      tarifa: impuestos.tarifa,
      impuestoDeterminado: impuestos.impuestoDeterminado,
      intereses: impuestos.intereses,
      sanciones: impuestos.sanciones,
      descuentos: impuestos.descuentos,
      totalAPagar: impuestos.totalAPagar,
      estadoActual: impuestos.estadoActual,
      asignadoAId: impuestos.asignadoAId,
      fechaVencimiento: impuestos.fechaVencimiento,
      fechaDeclaracion: impuestos.fechaDeclaracion,
      noExpediente: impuestos.noExpediente,
      observaciones: impuestos.observaciones,
      creadoEn: impuestos.creadoEn,
      contribuyenteId: contribuyentes.id,
      contribuyenteNombre: contribuyentes.nombreRazonSocial,
      contribuyenteNit: contribuyentes.nit,
    })
    .from(impuestos)
    .leftJoin(contribuyentes, eq(impuestos.contribuyenteId, contribuyentes.id))
    .where(eq(impuestos.id, idTrim));

  if (!row) notFound();

  const historial = await db
    .select({
      id: historialImpuesto.id,
      tipoEvento: historialImpuesto.tipoEvento,
      estadoAnterior: historialImpuesto.estadoAnterior,
      estadoNuevo: historialImpuesto.estadoNuevo,
      comentario: historialImpuesto.comentario,
      fecha: historialImpuesto.fecha,
      usuarioNombre: usuarios.nombre,
    })
    .from(historialImpuesto)
    .leftJoin(usuarios, eq(historialImpuesto.usuarioId, usuarios.id))
    .where(eq(historialImpuesto.impuestoId, idTrim))
    .orderBy(desc(historialImpuesto.fecha));

  const estado = ETIQUETAS_ESTADO[row.estadoActual] ?? {
    label: row.estadoActual,
    className: "bg-muted text-muted-foreground",
  };

  const cop = (val: string | null | undefined) =>
    val != null
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          maximumFractionDigits: 0,
        }).format(Number(val))
      : "—";

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/impuestos">← Impuestos</Link>
        </Button>
        <div className="flex gap-2 flex-wrap">
          <CambiarEstadoImpuestoButton id={row.id} estadoActual={row.estadoActual} />
          <Button asChild>
            <Link href={`/impuestos/${row.id}/editar`}>Editar</Link>
          </Button>
          <EliminarImpuestoButton id={row.id} />
        </div>
      </div>

      {/* Detalle principal */}
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {row.tipoImpuesto}
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${estado.className}`}
            >
              {estado.label}
            </span>
          </CardTitle>
          <CardDescription>
            Vigencia {row.vigencia} ·{" "}
            {ETIQUETAS_PERIODO[row.tipoPeriodo] ?? row.tipoPeriodo}
            {row.periodo ? ` ${row.periodo}` : ""}
            {row.noExpediente ? ` · Exp. ${row.noExpediente}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm">
            {/* Contribuyente */}
            {row.contribuyenteId && (
              <div>
                <dt className="text-muted-foreground">Contribuyente</dt>
                <dd className="font-medium">
                  <Link
                    href={`/contribuyentes/${row.contribuyenteId}`}
                    className="text-primary hover:underline"
                  >
                    {row.contribuyenteNombre}
                  </Link>
                  <span className="ml-2 text-muted-foreground text-xs">
                    NIT {row.contribuyenteNit}
                  </span>
                </dd>
              </div>
            )}

            {/* Liquidación */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              {row.baseGravable != null && (
                <div>
                  <dt className="text-muted-foreground">Base gravable</dt>
                  <dd className="font-medium">{cop(row.baseGravable)}</dd>
                </div>
              )}
              {row.tarifa != null && (
                <div>
                  <dt className="text-muted-foreground">Tarifa</dt>
                  <dd className="font-medium">
                    {(Number(row.tarifa) * 100).toFixed(4)} %
                  </dd>
                </div>
              )}
              {row.impuestoDeterminado != null && (
                <div>
                  <dt className="text-muted-foreground">Impuesto determinado</dt>
                  <dd className="font-medium">{cop(row.impuestoDeterminado)}</dd>
                </div>
              )}
              {Number(row.intereses) > 0 && (
                <div>
                  <dt className="text-muted-foreground">Intereses</dt>
                  <dd className="font-medium">{cop(row.intereses)}</dd>
                </div>
              )}
              {Number(row.sanciones) > 0 && (
                <div>
                  <dt className="text-muted-foreground">Sanciones</dt>
                  <dd className="font-medium">{cop(row.sanciones)}</dd>
                </div>
              )}
              {Number(row.descuentos) > 0 && (
                <div>
                  <dt className="text-muted-foreground">Descuentos</dt>
                  <dd className="font-medium">{cop(row.descuentos)}</dd>
                </div>
              )}
              {row.totalAPagar != null && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Total a pagar</dt>
                  <dd className="text-lg font-bold">{cop(row.totalAPagar)}</dd>
                </div>
              )}
            </div>

            {/* Fechas */}
            {(row.fechaVencimiento || row.fechaDeclaracion) && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                {row.fechaDeclaracion && (
                  <div>
                    <dt className="text-muted-foreground">Fecha declaración</dt>
                    <dd className="font-medium">{row.fechaDeclaracion}</dd>
                  </div>
                )}
                {row.fechaVencimiento && (
                  <div>
                    <dt className="text-muted-foreground">Fecha vencimiento</dt>
                    <dd className="font-medium">{row.fechaVencimiento}</dd>
                  </div>
                )}
              </div>
            )}

            {/* Observaciones */}
            {row.observaciones && (
              <div className="mt-2">
                <dt className="text-muted-foreground">Observaciones</dt>
                <dd className="mt-1 text-sm">{row.observaciones}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Agregar nota */}
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Agregar nota</CardTitle>
        </CardHeader>
        <CardContent>
          <AgregarNotaButton id={row.id} />
        </CardContent>
      </Card>

      {/* Historial */}
      {historial.length > 0 && (
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle className="text-base">Historial</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l border-border pl-6 space-y-4">
              {historial.map((h) => (
                <li key={h.id} className="relative">
                  <div className="absolute -left-[1.375rem] mt-1.5 h-3 w-3 rounded-full border border-border bg-background" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      {new Date(h.fecha).toLocaleString("es-CO")}
                      {h.usuarioNombre ? ` · ${h.usuarioNombre}` : ""}
                    </span>
                    <span className="text-sm font-medium">
                      {ETIQUETAS_EVENTO[h.tipoEvento] ?? h.tipoEvento}
                      {h.tipoEvento === "cambio_estado" &&
                        h.estadoAnterior &&
                        h.estadoNuevo && (
                          <span className="font-normal text-muted-foreground">
                            {" "}· {ETIQUETAS_ESTADO[h.estadoAnterior]?.label ?? h.estadoAnterior}{" "}
                            → {ETIQUETAS_ESTADO[h.estadoNuevo]?.label ?? h.estadoNuevo}
                          </span>
                        )}
                    </span>
                    {h.comentario && (
                      <p className="text-sm text-muted-foreground">{h.comentario}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
