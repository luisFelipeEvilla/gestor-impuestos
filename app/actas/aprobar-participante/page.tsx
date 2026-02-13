import Link from "next/link";
import {
  validarEnlaceAprobacionParticipante,
  obtenerRespuestaParticipante,
  aprobarParticipanteFromPreviewAction,
  rechazarParticipanteFromPreviewAction,
  obtenerActaParaPreviewParticipante,
} from "@/lib/actions/actas";
import { generarFirmaDescargaDocumento } from "@/lib/actas-aprobacion";
import { FormAprobarSubmitButton } from "@/components/actas/form-aprobar-submit-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Aprobar acta | Gestor de Impuestos",
  description: "Vista previa del acta y confirmación de aprobación.",
};

function sanitizeHtmlForDisplay(html: string): string {
  if (!html?.trim()) return "";
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}

type Props = {
  searchParams: Promise<{
    acta?: string;
    integrante?: string;
    firma?: string;
    aprobado?: string;
    rechazado?: string;
    error?: string;
    motivo?: string;
  }>;
};

function ErrorCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-gradient-to-br from-background via-background to-primary/5 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default async function AprobarParticipantePage({ searchParams }: Props) {
  const params = await searchParams;
  const actaParam = params.acta;
  const integranteParam = params.integrante;
  const firmaParam = params.firma;
  const aprobado = params.aprobado === "1";
  const rechazado = params.rechazado === "1";
  const errorParam = params.error === "1";

  if (!actaParam || !integranteParam || !firmaParam) {
    return (
      <ErrorCard
        title="Enlace inválido"
        description="Falta información en el enlace. Utilice el enlace que recibió por correo para ver y aprobar el acta."
      />
    );
  }

  const actaId = parseInt(actaParam, 10);
  const integranteId = parseInt(integranteParam, 10);
  if (Number.isNaN(actaId) || Number.isNaN(integranteId) || actaId < 1 || integranteId < 1) {
    return (
      <ErrorCard
        title="Enlace inválido o expirado"
        description="No se pudo procesar la solicitud. Si el problema persiste, póngase en contacto con el administrador."
      />
    );
  }

  const validacion = await validarEnlaceAprobacionParticipante(
    actaId,
    integranteId,
    firmaParam.trim()
  );

  if (!validacion.valido) {
    return (
      <ErrorCard
        title="Enlace inválido o expirado"
        description={validacion.error ?? "No se pudo validar el enlace."}
      />
    );
  }

  if (aprobado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-gradient-to-br from-background via-background to-primary/5 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Aprobación registrada</CardTitle>
            <CardDescription>
              Has aprobado el acta correctamente. Gracias por confirmar.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (rechazado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-gradient-to-br from-background via-background to-primary/5 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Rechazo registrado</CardTitle>
            <CardDescription>
              Se ha registrado tu rechazo del acta. El equipo tendrá en cuenta tu motivo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (errorParam) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-gradient-to-br from-background via-background to-primary/5 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error al registrar</CardTitle>
            <CardDescription>
              No se pudo registrar la aprobación. Intente de nuevo o póngase en contacto con el administrador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="default">
              <Link
                href={`/actas/aprobar-participante?acta=${actaId}&integrante=${integranteId}&firma=${encodeURIComponent(firmaParam)}`}
              >
                Volver al acta
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const acta = await obtenerActaParaPreviewParticipante(actaId);
  if (!acta) {
    return (
      <ErrorCard
        title="Acta no encontrada"
        description="El acta ya no está disponible."
      />
    );
  }

  const respuesta = await obtenerRespuestaParticipante(actaId, integranteId);
  const contenidoSanitizado =
    acta.contenido && acta.contenido.trim() !== ""
      ? sanitizeHtmlForDisplay(acta.contenido)
      : null;
  const compromisosSanitizado =
    acta.compromisos && acta.compromisos.trim() !== ""
      ? sanitizeHtmlForDisplay(acta.compromisos)
      : null;
  const tieneCompromisosLista = acta.compromisosLista?.length > 0;

  function formatTamano(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Vista previa del acta</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Revise el contenido del acta y confirme su aprobación a continuación.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acta #{acta.id}</CardTitle>
            <CardDescription>
              {new Date(acta.fecha).toLocaleDateString("es-CO", { dateStyle: "long" })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Objetivo</p>
              <p className="mt-1">{acta.objetivo}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Contenido</p>
              {contenidoSanitizado ? (
                <div
                  className="mt-1 prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2"
                  dangerouslySetInnerHTML={{ __html: contenidoSanitizado }}
                />
              ) : (
                <p className="text-muted-foreground mt-1 text-sm italic">Sin contenido.</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Compromisos</p>
              {tieneCompromisosLista ? (
                <ul className="mt-2 space-y-3" role="list">
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
                      </p>
                    </li>
                  ))}
                </ul>
              ) : compromisosSanitizado ? (
                <div
                  className="mt-1 prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2"
                  dangerouslySetInnerHTML={{ __html: compromisosSanitizado }}
                />
              ) : (
                <p className="text-muted-foreground mt-1 text-sm italic">Sin compromisos.</p>
              )}
            </div>
            {acta.documentos.length > 0 && (
              <div>
                <p className="text-muted-foreground text-sm font-medium">Documentos adjuntos</p>
                <ul className="mt-2 space-y-1.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm" role="list">
                  {acta.documentos.map((doc) => {
                    const firmaDoc = generarFirmaDescargaDocumento(actaId, integranteId, doc.id);
                    const urlDescarga = `/api/actas/documentos/descargar?acta=${actaId}&integrante=${integranteId}&doc=${doc.id}&firma=${firmaDoc}`;
                    return (
                      <li
                        key={doc.id}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <Link
                          href={urlDescarga}
                          className="text-primary hover:underline font-medium"
                          download
                        >
                          {doc.nombreOriginal}
                        </Link>
                        <span className="text-muted-foreground text-xs">
                          {formatTamano(doc.tamano)}
                          {" · "}
                          {new Date(doc.creadoEn).toLocaleDateString("es-CO", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {respuesta.respondido ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {respuesta.rechazado ? "Has rechazado este acta" : "Ya has aprobado este acta"}
              </CardTitle>
              <CardDescription>
                {respuesta.rechazado ? (
                  <>
                    Tu rechazo fue registrado anteriormente.
                    {respuesta.motivoRechazo && (
                      <span className="mt-2 block rounded-md border border-border bg-muted/30 p-2 text-sm">
                        Motivo: {respuesta.motivoRechazo}
                      </span>
                    )}
                  </>
                ) : (
                  "Tu aprobación fue registrada anteriormente. Gracias por confirmar."
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Confirmar aprobación o rechazo</CardTitle>
              <CardDescription>
                Revise el acta y confirme su aprobación o indique su rechazo con un motivo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={aprobarParticipanteFromPreviewAction} className="flex flex-col gap-4">
                <input type="hidden" name="actaId" value={actaId} readOnly aria-hidden />
                <input type="hidden" name="integranteId" value={integranteId} readOnly aria-hidden />
                <input type="hidden" name="firma" value={firmaParam} readOnly aria-hidden />
                <FormAprobarSubmitButton />
              </form>
              <div className="relative">
                <span className="bg-card text-muted-foreground absolute left-1/2 -translate-x-1/2 px-2 text-xs">
                  o
                </span>
                <div className="border-t border-border pt-4" />
              </div>
              <form action={rechazarParticipanteFromPreviewAction} className="flex flex-col gap-4">
                <input type="hidden" name="actaId" value={actaId} readOnly aria-hidden />
                <input type="hidden" name="integranteId" value={integranteId} readOnly aria-hidden />
                <input type="hidden" name="firma" value={firmaParam} readOnly aria-hidden />
                <div className="grid gap-2">
                  <label htmlFor="motivoRechazo" className="text-sm font-medium">
                    Rechazar acta (opcional: indique el motivo)
                  </label>
                  <textarea
                    id="motivoRechazo"
                    name="motivoRechazo"
                    rows={3}
                    placeholder="Ej.: No estoy de acuerdo con el punto 2 porque..."
                    className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                    aria-label="Motivo del rechazo"
                  />
                </div>
                <Button type="submit" variant="destructive">
                  Rechazar acta
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
