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
import { eq, desc, asc } from "drizzle-orm";
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
  AsignarProcesoForm,
  BotonesNotificacion,
  CardGeneral,
  CardEnContacto,
  CardAcuerdoDePago,
  CardCobroCoactivo,
} from "@/components/procesos/acciones-gestion";
import { DetalleConHistorial } from "./detalle-con-historial";

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

const LABEL_CATEGORIA: Record<string, string> = {
  general: "General",
  en_contacto: "En contacto",
  acuerdo_pago: "Acuerdo de pago",
  cobro_coactivo: "Cobro coactivo",
};

function labelTipoEvento(
  tipo: string,
  categoriaNota?: string | null
): string {
  const map: Record<string, string> = {
    cambio_estado: "Cambio de estado",
    asignacion: "Asignación",
    nota: "Nota",
    notificacion: "Notificación",
    pago: "Pago",
  };
  const base = map[tipo] ?? tipo;
  if (tipo === "nota" && categoriaNota) {
    const catLabel = LABEL_CATEGORIA[categoriaNota] ?? categoriaNota;
    return `${base} (${catLabel})`;
  }
  return base;
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
        categoriaNota: historialProceso.categoriaNota,
        fecha: historialProceso.fecha,
      })
      .from(historialProceso)
      .where(eq(historialProceso.procesoId, id))
      .orderBy(asc(historialProceso.fecha))
      .limit(50),
    db
      .select({ id: usuarios.id, nombre: usuarios.nombre })
      .from(usuarios)
      .where(eq(usuarios.activo, true)),
    db
      .select({
        id: documentosProceso.id,
        categoria: documentosProceso.categoria,
        nombreOriginal: documentosProceso.nombreOriginal,
        mimeType: documentosProceso.mimeType,
        tamano: documentosProceso.tamano,
        creadoEn: documentosProceso.creadoEn,
      })
      .from(documentosProceso)
      .where(eq(documentosProceso.procesoId, id))
      .orderBy(desc(documentosProceso.creadoEn)),
  ]);

  const notificacionEvent = historialRows.find((h) => h.tipoEvento === "notificacion");
  const yaNotificado = !!notificacionEvent;
  const fechaNotificacion = notificacionEvent?.fecha ?? null;

  type CategoriaKey = "general" | "en_contacto" | "acuerdo_pago" | "cobro_coactivo";
  const categorias: CategoriaKey[] = ["general", "en_contacto", "acuerdo_pago", "cobro_coactivo"];

  const documentosPorCategoria = categorias.reduce(
    (acc, cat) => {
      acc[cat] = documentosRows
        .filter((d) => (d.categoria ?? "general") === cat)
        .map((d) => ({
          id: d.id,
          nombreOriginal: d.nombreOriginal,
          mimeType: d.mimeType,
          tamano: d.tamano,
          creadoEn: d.creadoEn,
        }));
      return acc;
    },
    {} as Record<CategoriaKey, { id: number; nombreOriginal: string; mimeType: string; tamano: number; creadoEn: Date }[]>
  );

  const notasPorCategoria = categorias.reduce(
    (acc, cat) => {
      acc[cat] = historialRows
        .filter(
          (h) =>
            h.tipoEvento === "nota" && (h.categoriaNota ?? "general") === cat
        )
        .map((h) => ({
          id: h.id,
          comentario: h.comentario ?? "",
          fecha: h.fecha,
        }));
      return acc;
    },
    {} as Record<CategoriaKey, { id: number; comentario: string; fecha: Date }[]>
  );

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

      <DetalleConHistorial
        formCard={
          <Card className="max-w-xl">
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
                <div className="pt-2 border-t">
                  <dt className="text-muted-foreground text-xs mb-1">Asignar responsable</dt>
                  <dd>
                    <AsignarProcesoForm
                      procesoId={row.id}
                      asignadoAId={row.asignadoAId}
                      usuarios={usuariosList}
                    />
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        }
        timelineCard={
          <Card className="sticky top-6 flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="shrink-0">
              <CardTitle>Historial</CardTitle>
              <CardDescription>
                Registro de cambios (más antiguos primero).
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 shrink overflow-y-auto">
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
                            {labelTipoEvento(h.tipoEvento, h.categoriaNota)}
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
        }
      />

      <div className="space-y-6">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Notificación</CardTitle>
            <CardDescription>
              Primer paso después de asignar: envía la notificación al contribuyente. El estado pasará a &quot;Notificado&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BotonesNotificacion
              procesoId={row.id}
              yaNotificado={yaNotificado}
              fechaNotificacion={fechaNotificacion}
            />
          </CardContent>
        </Card>

        <CardGeneral
          procesoId={row.id}
          documentos={documentosPorCategoria.general}
          notas={notasPorCategoria.general}
        />
        <CardEnContacto
          procesoId={row.id}
          estadoActual={row.estadoActual ?? ""}
          documentos={documentosPorCategoria.en_contacto}
          notas={notasPorCategoria.en_contacto}
        />
        <CardAcuerdoDePago
          procesoId={row.id}
          estadoActual={row.estadoActual ?? ""}
          documentos={documentosPorCategoria.acuerdo_pago}
          notas={notasPorCategoria.acuerdo_pago}
        />
        <CardCobroCoactivo
          procesoId={row.id}
          estadoActual={row.estadoActual ?? ""}
          documentos={documentosPorCategoria.cobro_coactivo}
          notas={notasPorCategoria.cobro_coactivo}
        />
      </div>
    </div>
  );
}
