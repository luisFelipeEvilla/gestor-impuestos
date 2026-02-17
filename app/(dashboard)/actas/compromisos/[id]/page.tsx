import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormEstadoCompromiso } from "@/components/actas/form-estado-compromiso";
import { obtenerCompromisoPorIdConHistorial } from "@/lib/actions/compromisos-acta";
import { Clock, User, FileText, Building2, Paperclip } from "lucide-react";
import { unstable_noStore } from "next/cache";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LABEL_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  cumplido: "Cumplido",
  no_cumplido: "No cumplido",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CompromisoDetallePage({ params }: Props) {
  unstable_noStore();
  unstable_noStore();
  const { id } = await params;
  const compromisoId = parseInt(id, 10);
  if (Number.isNaN(compromisoId) || compromisoId < 1) notFound();

  const data = await obtenerCompromisoPorIdConHistorial(compromisoId);
  if (!data) notFound();

  const { compromiso, historial } = data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/actas">← Actas</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/actas/compromisos">Gestión de compromisos</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Compromiso #{compromiso.id}
        </h1>
        <p className="text-muted-foreground text-sm">
          Hoja de vida y seguimiento del compromiso. Actualice el estado y consulte el historial.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del compromiso</CardTitle>
          <CardDescription>Descripción, acta, asignado y clientes vinculados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Descripción</p>
            <p className="text-foreground whitespace-pre-wrap">{compromiso.descripcion}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha límite</p>
                <p className="text-foreground">
                  {compromiso.fechaLimite
                    ? new Date(compromiso.fechaLimite).toLocaleDateString("es-CO", {
                        dateStyle: "long",
                      })
                    : "Sin fecha límite"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Asignado a</p>
                <p className="text-foreground">
                  {compromiso.asignadoNombre ?? "Sin asignar"}
                  {compromiso.asignadoTipo && (
                    <span className="text-muted-foreground text-sm ml-1">
                      ({compromiso.asignadoTipo === "interno" ? "interno" : "cliente"})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 sm:col-span-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Acta</p>
                <Link
                  href={`/actas/${compromiso.actaId}`}
                  className="text-primary hover:underline font-medium"
                >
                  Acta #{compromiso.actaId}
                </Link>
                <span className="text-muted-foreground text-sm ml-2">
                  {new Date(compromiso.actaFecha).toLocaleDateString("es-CO", {
                    dateStyle: "short",
                  })}
                  {" · "}
                  {compromiso.actaObjetivo}
                </span>
              </div>
            </div>
            {compromiso.clientesNombres.length > 0 && (
              <div className="flex items-start gap-2 sm:col-span-2">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Clientes</p>
                  <p className="text-foreground">{compromiso.clientesNombres.join(", ")}</p>
                </div>
              </div>
            )}
          </div>
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-1">Estado actual</p>
            <Badge
              variant={
                compromiso.estado === "cumplido"
                  ? "default"
                  : compromiso.estado === "no_cumplido"
                    ? "destructive"
                    : "secondary"
              }
              className={
                compromiso.estado === "cumplido"
                  ? "bg-green-600 hover:bg-green-600"
                  : undefined
              }
            >
              {LABEL_ESTADO[compromiso.estado] ?? compromiso.estado}
            </Badge>
            {compromiso.actualizadoEn && (
              <p className="text-muted-foreground text-xs mt-1">
                Última actualización:{" "}
                {new Date(compromiso.actualizadoEn).toLocaleString("es-CO", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
                {compromiso.actualizadoPorNombre && ` por ${compromiso.actualizadoPorNombre}`}
              </p>
            )}
            {compromiso.detalleActualizacion && (
              <p className="text-sm mt-1 text-foreground">{compromiso.detalleActualizacion}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agregar actualización</CardTitle>
          <CardDescription>
            Cambie el estado y opcionalmente agregue una observación. Quedará registrado en el historial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormEstadoCompromiso
            compromisoId={compromiso.id}
            estadoActual={compromiso.estado}
            detalleActual={compromiso.detalleActualizacion}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de actualizaciones</CardTitle>
          <CardDescription>
            {historial.length === 0
              ? "Aún no hay registros en el historial. Al actualizar el estado se creará el primer registro."
              : `${historial.length} registro(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historial.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No hay actualizaciones registradas para este compromiso.
            </p>
          ) : (
            <ul className="space-y-4" role="list">
              {historial.map((h, index) => (
                <li
                  key={h.id}
                  className="relative pl-6 pb-4 last:pb-0"
                  aria-label={`Actualización ${index + 1}, ${new Date(h.creadoEn).toLocaleString("es-CO")}`}
                >
                  {index < historial.length - 1 && (
                    <span
                      className="absolute left-[5px] top-5 bottom-0 w-px bg-border"
                      aria-hidden
                    />
                  )}
                  <span
                    className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-primary shrink-0"
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <time
                      dateTime={new Date(h.creadoEn).toISOString()}
                      className="text-sm font-medium text-foreground"
                    >
                      {new Date(h.creadoEn).toLocaleString("es-CO", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </time>
                    {h.creadoPorNombre && (
                      <span className="text-muted-foreground text-sm">{h.creadoPorNombre}</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {h.estadoAnterior != null ? (
                      <>
                        <Badge variant="outline" className="font-normal">
                          {LABEL_ESTADO[h.estadoAnterior] ?? h.estadoAnterior}
                        </Badge>
                        <span className="text-muted-foreground text-sm" aria-hidden>
                          →
                        </span>
                      </>
                    ) : null}
                    <Badge
                      variant={
                        h.estadoNuevo === "cumplido"
                          ? "default"
                          : h.estadoNuevo === "no_cumplido"
                            ? "destructive"
                            : "secondary"
                      }
                      className={
                        h.estadoNuevo === "cumplido" ? "bg-green-600 hover:bg-green-600" : undefined
                      }
                    >
                      {LABEL_ESTADO[h.estadoNuevo] ?? h.estadoNuevo}
                    </Badge>
                  </div>
                  {h.detalle && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {h.detalle}
                    </p>
                  )}
                  {h.documentos && h.documentos.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                      <ul className="flex flex-wrap gap-x-3 gap-y-1 list-none" role="list">
                        {h.documentos.map((doc) => (
                          <li key={doc.id}>
                            <a
                              href={`/api/compromisos/${compromiso.id}/documentos/${doc.id}`}
                              className="text-sm text-primary hover:underline"
                              download={doc.nombreOriginal}
                            >
                              {doc.nombreOriginal}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
