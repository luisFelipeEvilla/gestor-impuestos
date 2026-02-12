import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import {
  obtenerActaPorId,
  obtenerHistorialActa,
  obtenerAprobacionesPorActa,
  enviarActaAprobacion,
  aprobarActa,
  enviarActaPorCorreo,
  eliminarActa,
} from "@/lib/actions/actas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListaDocumentosActa, SubirDocumentoActaForm } from "@/components/actas/documentos-acta";
import { HistorialActa } from "@/components/actas/historial-acta";
import { BotonesActa } from "./botones-acta";

type Props = { params: Promise<{ id: string }> };

const LABEL_ESTADO: Record<string, string> = {
  borrador: "Borrador",
  pendiente_aprobacion: "Pendiente aprobación",
  aprobada: "Aprobada",
  enviada: "Enviada",
};

/** Permite solo etiquetas seguras para mostrar contenido HTML del acta. */
function sanitizeHtmlForDisplay(html: string): string {
  if (!html?.trim()) return "";
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}

export default async function ActaDetallePage({ params }: Props) {
  const { id } = await params;
  const actaId = parseInt(id, 10);
  if (Number.isNaN(actaId)) notFound();

  const [acta, historial, session, aprobaciones] = await Promise.all([
    obtenerActaPorId(actaId),
    obtenerHistorialActa(actaId),
    getSession(),
    obtenerAprobacionesPorActa(actaId),
  ]);

  if (!acta) notFound();

  const mostrarAprobacionesParticipantes = acta.estado === "enviada";

  const isAdmin = session?.user?.rol === "admin";
  const isCreador = session?.user?.id === acta.creadoPorId;
  const puedeEditar = acta.estado === "borrador" && (isCreador || isAdmin);
  const puedeEnviarAprobacion = acta.estado === "borrador" && (isCreador || isAdmin);
  const puedeAprobar = acta.estado === "pendiente_aprobacion" && isAdmin;
  const puedeEnviarCorreo = acta.estado === "aprobada" && isAdmin;
  const puedeEliminar = acta.estado === "borrador" && (isCreador || isAdmin);

  const contenidoSanitizado = acta.contenido
    ? sanitizeHtmlForDisplay(acta.contenido)
    : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/actas">← Actas</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Acta #{acta.id}
          </h1>
          <p className="text-muted-foreground text-sm">
            {new Date(acta.fecha).toLocaleDateString("es-CO", { dateStyle: "long" })}
            {" · "}
            {LABEL_ESTADO[acta.estado] ?? acta.estado}
          </p>
        </div>
        <BotonesActa
          actaId={acta.id}
          estado={acta.estado}
          puedeEditar={puedeEditar}
          puedeEnviarAprobacion={puedeEnviarAprobacion}
          puedeAprobar={puedeAprobar}
          puedeEnviarCorreo={puedeEnviarCorreo}
          puedeEliminar={puedeEliminar}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del acta</CardTitle>
          <CardDescription>
            Creado por {acta.creadorNombre ?? "—"}
            {acta.aprobadoPorNombre && ` · Aprobado por ${acta.aprobadoPorNombre}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-muted-foreground text-sm font-medium">Objetivo</p>
            <p className="mt-1">{acta.objetivo}</p>
          </div>
          {contenidoSanitizado && (
            <div>
              <p className="text-muted-foreground text-sm font-medium">Contenido</p>
              <div
                className="mt-1 prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: contenidoSanitizado }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {acta.clientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Clientes asociados</CardTitle>
            <CardDescription>Entidades relacionadas con esta acta</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1" role="list">
              {acta.clientes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/clientes/${c.id}`}
                    className="text-primary hover:underline"
                  >
                    {c.codigo ? `${c.codigo} – ` : ""}{c.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Integrantes</CardTitle>
          <CardDescription>Asistentes a la reunión</CardDescription>
        </CardHeader>
        <CardContent>
          {acta.integrantes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay integrantes.</p>
          ) : (
            <div className="space-y-4">
              {(["interno", "externo"] as const).map((tipo) => {
                const items = acta.integrantes.filter(
                  (i) => (i.tipo ?? "externo") === tipo
                );
                if (items.length === 0) return null;
                const titulo =
                  tipo === "interno"
                    ? "Empleados / asistentes propios"
                    : "Miembros externos";
                return (
                  <div key={tipo}>
                    <p className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
                      {titulo}
                    </p>
                    <ul className="space-y-1" role="list">
                      {items.map((inv) => (
                        <li key={inv.id}>
                          <strong>{inv.nombre}</strong>
                          <span className="text-muted-foreground ml-1">
                            {inv.email}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {mostrarAprobacionesParticipantes && (
        <Card>
          <CardHeader>
            <CardTitle>Aprobaciones de participantes</CardTitle>
            <CardDescription>
              Confirmación de lectura y aprobación tras el envío del acta por correo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {aprobaciones.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay integrantes en este acta.</p>
            ) : (
            <ul className="space-y-2" role="list">
              {aprobaciones.map((item) => (
                <li
                  key={item.actaIntegranteId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                >
                  <span>
                    <strong>{item.nombre}</strong>
                    <span className="text-muted-foreground ml-1">{item.email}</span>
                    {item.rutaFoto && (
                      <Link
                        href={`/api/actas/${acta.id}/aprobaciones/${item.actaIntegranteId}/foto`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline ml-2 text-xs"
                      >
                        Ver foto
                      </Link>
                    )}
                  </span>
                  <span
                    className={
                      item.aprobadoEn
                        ? "text-muted-foreground text-xs"
                        : "text-muted-foreground/70 text-xs italic"
                    }
                  >
                    {item.aprobadoEn
                      ? `Aprobado el ${new Date(item.aprobadoEn).toLocaleDateString("es-CO", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}`
                      : "Pendiente"}
                  </span>
                </li>
              ))}
            </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documentos adjuntos</CardTitle>
          <CardDescription>
            {puedeEditar
              ? "Sube archivos relacionados al acta. Solo puedes agregar o eliminar documentos cuando el acta está en borrador."
              : "Documentos vinculados a esta acta. Para agregar o quitar archivos, edita el acta si está en borrador."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {puedeEditar && <SubirDocumentoActaForm actaId={acta.id} />}
          <ListaDocumentosActa
            actaId={acta.id}
            documentos={acta.documentos}
            puedeEliminar={puedeEditar}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de modificaciones</CardTitle>
          <CardDescription>Registro de cambios del acta</CardDescription>
        </CardHeader>
        <CardContent>
          <HistorialActa items={historial} />
        </CardContent>
      </Card>
    </div>
  );
}
