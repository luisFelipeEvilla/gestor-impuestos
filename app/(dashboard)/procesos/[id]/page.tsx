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
  ordenesResolucion,
  acuerdosPago,
  cobrosCoactivos,
} from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
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
  AgregarNotaForm,
  AsignarProcesoForm,
  BotonesNotificacion,
  CardEnContacto,
  CardCobroCoactivo,
  ListaNotas,
} from "@/components/procesos/acciones-gestion";
import {
  ListaDocumentos,
  SubirDocumentoForm,
} from "@/components/procesos/documentos-proceso";
import { CardOrdenResolucion } from "@/components/procesos/card-orden-resolucion";
import { CardAcuerdosPagoList } from "@/components/procesos/card-acuerdos-pago-list";
import { SemaforoFechaLimite } from "@/components/procesos/semaforo-fecha-limite";
import { DetalleConHistorial } from "./detalle-con-historial";
import { unstable_noStore } from "next/cache";
import { labelEstado } from "@/lib/estados-proceso";
import type { EvidenciaEnvioEmail } from "@/lib/notificaciones/resend";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  en_contacto: "Cobro persuasivo",
  acuerdo_pago: "Acuerdo de pago",
  cobro_coactivo: "Cobro coactivo",
};

function labelTipoEvento(
  tipo: string,
  categoriaNota?: string | null,
  notificacionMetadata?: { tipo?: string } | null
): string {
  const map: Record<string, string> = {
    cambio_estado: "Cambio de estado",
    asignacion: "Asignación",
    nota: "Nota",
    notificacion: "Notificación",
    pago: "Pago",
  };
  if (tipo === "notificacion" && notificacionMetadata?.tipo === "fisica") {
    return "Notificación por vía física";
  }
  if (tipo === "notificacion") {
    return "Notificación por email";
  }
  const base = map[tipo] ?? tipo;
  if (tipo === "nota" && categoriaNota) {
    const catLabel = LABEL_CATEGORIA[categoriaNota] ?? categoriaNota;
    return `${base} (${catLabel})`;
  }
  return base;
}

export default async function DetalleProcesoPage({ params }: Props) {
  unstable_noStore();
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [row] = await db
    .select({
      id: procesos.id,
      vigencia: procesos.vigencia,
      periodo: procesos.periodo,
      noComparendo: procesos.noComparendo,
      montoCop: procesos.montoCop,
      estadoActual: procesos.estadoActual,
      asignadoAId: procesos.asignadoAId,
      fechaLimite: procesos.fechaLimite,
      fechaAplicacionImpuesto: procesos.fechaAplicacionImpuesto,
      creadoEn: procesos.creadoEn,
      impuestoNombre: impuestos.nombre,
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

  const session = await getSession();
  if (session?.user?.rol !== "admin") {
    if (!session?.user?.id || row.asignadoAId !== session.user.id) {
      notFound();
    }
  }

  const [historialRows, usuariosList, documentosRows, ordenResolucion, acuerdosPagoList, cobroCoactivo] = await Promise.all([
    db
      .select({
        id: historialProceso.id,
        tipoEvento: historialProceso.tipoEvento,
        estadoAnterior: historialProceso.estadoAnterior,
        estadoNuevo: historialProceso.estadoNuevo,
        comentario: historialProceso.comentario,
        categoriaNota: historialProceso.categoriaNota,
        metadata: historialProceso.metadata,
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
    db.select().from(ordenesResolucion).where(eq(ordenesResolucion.procesoId, id)).then((r) => r[0] ?? null),
    db.select().from(acuerdosPago).where(eq(acuerdosPago.procesoId, id)).orderBy(desc(acuerdosPago.creadoEn)),
    db.select().from(cobrosCoactivos).where(eq(cobrosCoactivos.procesoId, id)).then((r) => r[0] ?? null),
  ]);

  const notificacionEvent = historialRows.find((h) => h.tipoEvento === "notificacion");
  const yaNotificado = !!notificacionEvent;
  const fechaNotificacion = notificacionEvent?.fecha ?? null;
  const notificacionMetadata = (notificacionEvent?.metadata as {
    tipo?: string;
    documentoIds?: number[];
    envios?: EvidenciaEnvioEmail[];
  } | null) ?? null;
  const notifDocIds = notificacionMetadata && notificacionMetadata.tipo === "fisica" && Array.isArray(notificacionMetadata.documentoIds)
    ? notificacionMetadata.documentoIds
    : [];
  const documentosEvidencia = notifDocIds.length > 0
    ? documentosRows
        .filter((d) => notifDocIds.includes(d.id))
        .sort((a, b) => notifDocIds.indexOf(a.id) - notifDocIds.indexOf(b.id))
        .map((d) => ({ id: d.id, nombreOriginal: d.nombreOriginal }))
    : [];

  type CategoriaKey = "general" | "en_contacto" | "acuerdo_pago" | "cobro_coactivo" | "evidencia_notificacion";
  const categorias: CategoriaKey[] = ["general", "en_contacto", "acuerdo_pago", "cobro_coactivo", "evidencia_notificacion"];

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
          <Card className="w-full">
            <CardHeader>
              <CardTitle>
                Proceso #{row.id} · {row.impuestoNombre} – {row.contribuyenteNombre}
              </CardTitle>
              <CardDescription>
                Vigencia {row.vigencia}
                {row.periodo ? ` · Período ${row.periodo}` : ""}
                {" · "}
                Estado: <span>{labelEstado(row.estadoActual)}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <dl className="grid gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Impuesto</dt>
                  <dd className="font-medium">
                    {row.impuestoNombre}
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
                {row.noComparendo != null && row.noComparendo !== "" && (
                  <div>
                    <dt className="text-muted-foreground">No. comparendo</dt>
                    <dd className="font-medium">{row.noComparendo}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">Monto (COP)</dt>
                  <dd className="font-medium">{Number(row.montoCop).toLocaleString("es-CO")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Estado</dt>
                  <dd>{labelEstado(row.estadoActual)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Asignado a</dt>
                  <dd>{row.asignadoNombre ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fecha límite</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    <SemaforoFechaLimite fechaLimite={row.fechaLimite} variant="inline" />
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {formatDate(row.fechaLimite)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fecha creación/aplicación del impuesto</dt>
                  <dd>{formatDate(row.fechaAplicacionImpuesto)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Creado en el sistema</dt>
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
                            {labelTipoEvento(
                              h.tipoEvento,
                              h.categoriaNota,
                              h.tipoEvento === "notificacion" ? (h.metadata as { tipo?: string } | null) : undefined
                            )}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {formatDateTime(h.fecha)}
                          </span>
                        </div>
                        {(h.estadoAnterior != null || h.estadoNuevo != null) && (
                          <p className="text-muted-foreground text-xs">
                            {h.estadoAnterior != null && (
                              <span>De: {labelEstado(h.estadoAnterior)}</span>
                            )}
                            {h.estadoAnterior != null && h.estadoNuevo != null && " → "}
                            {h.estadoNuevo != null && (
                              <span>A: {labelEstado(h.estadoNuevo)}</span>
                            )}
                          </p>
                        )}
                        {h.comentario && (
                          <p className="text-muted-foreground text-sm">{h.comentario}</p>
                        )}
                        {h.tipoEvento === "notificacion" &&
                          Array.isArray((h.metadata as { envios?: unknown[] } | null)?.envios) &&
                          (h.metadata as { envios: { canal: string; to: string; sentAt: string; resendId?: string }[] }).envios.length > 0 && (
                            <div className="mt-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs">
                              <p className="font-medium text-foreground">Evidencia de envío</p>
                              {(h.metadata as { envios: { canal: string; to: string; sentAt: string; resendId?: string }[] }).envios.map((envio, i) => (
                                <p key={i} className="text-muted-foreground mt-0.5">
                                  {envio.canal}: {envio.to}
                                  {" · "}
                                  {new Date(envio.sentAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                                  {envio.resendId && ` · ID: ${envio.resendId}`}
                                </p>
                              ))}
                            </div>
                          )}
                        {h.tipoEvento === "notificacion" &&
                          (h.metadata as { tipo?: string; documentoIds?: number[] } | null)?.tipo === "fisica" &&
                          Array.isArray((h.metadata as { documentoIds?: number[] }).documentoIds) &&
                          (h.metadata as { documentoIds: number[] }).documentoIds.length > 0 && (
                            <div className="mt-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs">
                              <p className="font-medium text-foreground">Evidencia adjunta</p>
                              {documentosRows
                                .filter((d) => (h.metadata as { documentoIds: number[] }).documentoIds.includes(d.id))
                                .sort(
                                  (a, b) =>
                                    (h.metadata as { documentoIds: number[] }).documentoIds.indexOf(a.id) -
                                    (h.metadata as { documentoIds: number[] }).documentoIds.indexOf(b.id)
                                )
                                .map((doc) => (
                                  <p key={doc.id} className="mt-0.5">
                                    <a
                                      href={`/api/procesos/${id}/documentos/${doc.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                    >
                                      {doc.nombreOriginal}
                                    </a>
                                  </p>
                                ))}
                            </div>
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

      <div className="w-full space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Documentos generales del proceso</CardTitle>
            <CardDescription>
              Documentos del proceso no asociados a una etapa concreta (en contacto, acuerdo de pago o cobro coactivo).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SubirDocumentoForm procesoId={row.id} categoria="general" />
            <ListaDocumentos
              procesoId={row.id}
              documentos={documentosPorCategoria.general}
              puedeEliminar
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comentarios generales del proceso</CardTitle>
            <CardDescription>
              Notas y comentarios generales del proceso (no asociados a una etapa concreta).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AgregarNotaForm procesoId={row.id} categoria="general" />
            <ListaNotas notas={notasPorCategoria.general} />
          </CardContent>
        </Card>

        <CardOrdenResolucion procesoId={row.id} orden={ordenResolucion} />
      </div>

      <div className="space-y-6">
        <Card className="w-full">
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
              notificacionMetadata={notificacionMetadata}
              documentosEvidencia={documentosEvidencia}
            />
          </CardContent>
        </Card>

        <CardEnContacto
          procesoId={row.id}
          estadoActual={row.estadoActual ?? ""}
          documentos={documentosPorCategoria.en_contacto}
          notas={notasPorCategoria.en_contacto}
        />

        <CardAcuerdosPagoList
          procesoId={row.id}
          acuerdos={acuerdosPagoList}
          estadoActual={row.estadoActual ?? ""}
          documentos={documentosPorCategoria.acuerdo_pago}
          notas={notasPorCategoria.acuerdo_pago}
        />
        <CardCobroCoactivo
          procesoId={row.id}
          estadoActual={row.estadoActual ?? ""}
          documentos={documentosPorCategoria.cobro_coactivo}
          notas={notasPorCategoria.cobro_coactivo}
          cobroCoactivo={cobroCoactivo}
        />
      </div>
    </div>
  );
}
