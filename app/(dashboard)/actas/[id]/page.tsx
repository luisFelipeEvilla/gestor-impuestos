import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import {
  obtenerActaPorId,
  obtenerHistorialActa,
  obtenerAprobacionesPorActa
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
  if (!id) notFound();

  const [acta, historial, session, aprobaciones] = await Promise.all([
    obtenerActaPorId(id),
    obtenerHistorialActa(id),
    getSession(),
    obtenerAprobacionesPorActa(id),
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
            Acta #{acta.serial}
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
          <CardTitle>Objetivo</CardTitle>
          <CardDescription>
            Creado por {acta.creadorNombre ?? "—"}
            {acta.aprobadoPorNombre && ` · Aprobado por ${acta.aprobadoPorNombre}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">{acta.objetivo}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contenido</CardTitle>
          <CardDescription>
            Desarrollo y notas de la reunión
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contenidoSanitizado ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: contenidoSanitizado }}
            />
          ) : (
            <p className="text-muted-foreground text-sm italic">Sin contenido.</p>
          )}
        </CardContent>
      </Card>

      {acta.actividades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Actividades desarrolladas</CardTitle>
            <CardDescription>
              Actividades de gestión tributaria y cobro coactivo desarrolladas en esta reunión
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2" role="list">
              {acta.actividades.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="font-medium text-foreground">{a.codigo}</span>
                  {" — "}
                  <span className="text-muted-foreground">{a.descripcion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Compromisos</CardTitle>
          <CardDescription>
            Compromisos pactados en la reunión y su estado de seguimiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {acta.compromisosLista.length > 0 ? (
            <ul className="space-y-3" role="list">
              {acta.compromisosLista.map((c) => (
                <li
                  key={c.id}
                  className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                >
                  <p className="font-medium">{c.descripcion}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Fecha límite:{" "}
                    {c.fechaLimite
                      ? new Date(c.fechaLimite).toLocaleDateString("es-CO", {
                          dateStyle: "short",
                        })
                      : "—"}
                    {c.asignadoNombre != null && (
                      <>
                        {" · "}
                        Asignado: {c.asignadoNombre}
                      </>
                    )}
                    {c.estado != null && (
                      <>
                        {" · "}
                        Estado:{" "}
                        <span
                          className={
                            c.estado === "cumplido"
                              ? "text-green-600 dark:text-green-400"
                              : c.estado === "no_cumplido"
                                ? "text-destructive"
                                : undefined
                          }
                        >
                          {c.estado === "pendiente"
                            ? "Pendiente"
                            : c.estado === "cumplido"
                              ? "Cumplido"
                              : "No cumplido"}
                        </span>
                      </>
                    )}
                  </p>
                  {c.detalleActualizacion && (
                    <p className="text-muted-foreground mt-1 text-xs italic">
                      {c.detalleActualizacion}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm italic">Sin compromisos.</p>
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
                          {inv.cargo && (
                            <span className="text-muted-foreground ml-1">
                              · {inv.cargo}
                            </span>
                          )}
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
                    {item.cargo && (
                      <span className="text-muted-foreground ml-1">· {item.cargo}</span>
                    )}
                  </span>
                  <span
                    className={
                      item.rechazado
                        ? "text-destructive text-xs"
                        : item.aprobadoEn
                          ? "text-muted-foreground text-xs"
                          : "text-muted-foreground/70 text-xs italic"
                    }
                  >
                    {item.rechazado ? (
                      <span>
                        Rechazado
                        {item.motivoRechazo && (
                          <span className="block mt-1 font-normal text-muted-foreground max-w-md">
                            {item.motivoRechazo}
                          </span>
                        )}
                      </span>
                    ) : item.aprobadoEn ? (
                      `Aprobado el ${new Date(item.aprobadoEn).toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}`
                    ) : (
                      "Pendiente"
                    )}
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
