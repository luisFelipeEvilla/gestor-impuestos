"use client";

import * as React from "react";
import { useTransition } from "react";
import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Upload,
  RotateCcw,
  Download,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileInputDropzone } from "@/components/ui/file-input-dropzone";
import {
  previewImportacionResoluciones,
  ejecutarImportacionResoluciones,
  type FilaPreviewResolucion,
  type ImportResolucionesResult,
} from "@/lib/actions/importar-resoluciones";

type Step =
  | { type: "idle" }
  | {
      type: "preview";
      filas: FilaPreviewResolucion[];
      totalArchivos: number;
      resumen: { conMatch: number; yaTieneArchivo: number; sinMatch: number };
    }
  | { type: "done"; resultado: Extract<ImportResolucionesResult, { ok: true }> };

export function ImportarResolucionesForm() {
  const [step, setStep] = React.useState<Step>({ type: "idle" });
  const [archivos, setArchivos] = React.useState<File[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isPreviewing, startPreviewing] = useTransition();
  const [isImporting, startImporting] = useTransition();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setArchivos(files);
    setStep({ type: "idle" });
    setErrorMsg(null);
  };

  const handlePreview = () => {
    if (archivos.length === 0) return;
    setErrorMsg(null);
    startPreviewing(async () => {
      const fd = new FormData();
      for (const f of archivos) fd.append("archivos", f);
      const result = await previewImportacionResoluciones(fd);
      if (result.ok) {
        setStep({
          type: "preview",
          filas: result.filas,
          totalArchivos: result.totalArchivos,
          resumen: result.resumen,
        });
      } else {
        setErrorMsg(result.error);
      }
    });
  };

  const handleConfirmImport = () => {
    if (archivos.length === 0) return;
    setConfirmOpen(false);
    startImporting(async () => {
      const fd = new FormData();
      for (const f of archivos) fd.append("archivos", f);
      const result = await ejecutarImportacionResoluciones(fd);
      if (result.ok) {
        setStep({ type: "done", resultado: result });
      } else {
        setErrorMsg(result.error);
      }
    });
  };

  const handleReset = () => {
    setStep({ type: "idle" });
    setArchivos([]);
    setErrorMsg(null);
  };

  const handleDescargarSinMatch = () => {
    if (step.type !== "preview") return;
    const filas = step.filas.filter((f) => f.estado === "sin_match");
    const csv = ["Archivo;N° Comparendo", ...filas.map((f) => `${f.nombreArchivo};${f.noComparendo}`)].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resoluciones-sin-match-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const puedeImportar =
    step.type === "preview" && step.resumen.conMatch > 0 && !isImporting;

  return (
    <div className="space-y-6">
      {step.type !== "done" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" aria-hidden />
              Seleccionar archivos PDF
            </CardTitle>
            <CardDescription>
              Seleccione uno o varios archivos PDF cuyo nombre sea el número de comparendo
              (ej: <code className="text-xs bg-muted rounded px-1">99999999000005101878.pdf</code>).
              El sistema adjuntará el PDF como orden de resolución del proceso correspondiente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileInputDropzone
              name="archivos"
              accept=".pdf"
              multiple
              onChange={handleFileChange}
              placeholder="Arrastre los PDFs aquí o haga clic para seleccionar"
              disabled={isPreviewing || isImporting}
            />

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <XCircle className="size-4 mt-0.5 shrink-0" aria-hidden />
                {errorMsg}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                onClick={handlePreview}
                disabled={archivos.length === 0 || isPreviewing || isImporting}
              >
                {isPreviewing ? (
                  <>
                    <span
                      className="size-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full inline-block"
                      aria-hidden
                    />
                    Procesando…
                  </>
                ) : (
                  <>
                    <Upload className="size-4 mr-2" aria-hidden />
                    Previsualizar
                  </>
                )}
              </Button>
              {step.type === "preview" && (
                <Button variant="ghost" onClick={handleReset} disabled={isImporting}>
                  <RotateCcw className="size-4 mr-2" aria-hidden />
                  Cambiar archivos
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step.type === "preview" && (() => {
        const filasConMatch = step.filas.filter((f) => f.estado === "match");
        const filasYaTieneArchivo = step.filas.filter((f) => f.estado === "ya_tiene_archivo");
        const filasSinMatch = step.filas.filter((f) => f.estado === "sin_match");
        const limit = 100;
        return (
          <>
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>Vista previa</CardTitle>
                  <CardDescription>
                    <strong>{step.totalArchivos.toLocaleString("es-CO")}</strong> archivos en total.{" "}
                    A importar:{" "}
                    <strong className="text-green-700 dark:text-green-400">
                      {step.resumen.conMatch}
                    </strong>.{" "}
                    Ya tienen archivo:{" "}
                    <strong className="text-yellow-700 dark:text-yellow-400">
                      {step.resumen.yaTieneArchivo}
                    </strong>.{" "}
                    Sin match:{" "}
                    <strong className="text-destructive">{step.resumen.sinMatch}</strong>.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={!puedeImportar}
                  className="shrink-0"
                >
                  {isImporting ? (
                    <>
                      <span
                        className="size-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full inline-block"
                        aria-hidden
                      />
                      Importando…
                    </>
                  ) : (
                    "Importar resoluciones"
                  )}
                </Button>
              </CardHeader>
            </Card>

            {/* A importar */}
            <Card className="border-green-200 dark:border-green-900">
              <CardHeader>
                <CardTitle className="text-base text-green-700 dark:text-green-400">
                  A importar ({filasConMatch.length.toLocaleString("es-CO")})
                </CardTitle>
                <CardDescription>
                  Archivos con proceso coincidente. Los que ya tienen registro de resolución
                  sin archivo recibirán el PDF; los demás crearán el registro.
                  {filasConMatch.length > limit &&
                    ` Mostrando los primeros ${limit.toLocaleString("es-CO")}.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border border-green-200 dark:border-green-900">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Archivo</TableHead>
                        <TableHead>N° Comparendo</TableHead>
                        <TableHead>Proceso / Contribuyente</TableHead>
                        <TableHead>Tiene registro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filasConMatch.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                            No hay archivos para importar.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filasConMatch.slice(0, limit).map((fila, i) => (
                          <TableRow key={`match-${i}`}>
                            <TableCell className="font-mono text-xs">{fila.nombreArchivo}</TableCell>
                            <TableCell className="font-mono text-xs">{fila.noComparendo}</TableCell>
                            <TableCell className="max-w-[220px] truncate">
                              {fila.procesoId != null ? (
                                <Link
                                  href={`/procesos/${fila.procesoId}`}
                                  className="text-primary hover:underline text-sm"
                                >
                                  #{fila.procesoId}
                                  {fila.contribuyenteNombre
                                    ? ` · ${fila.contribuyenteNombre}`
                                    : ""}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {fila.tieneRegistro ? "Sí (sin archivo)" : "No"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Ya tienen archivo */}
            <Card className="border-yellow-200 dark:border-yellow-900">
              <CardHeader>
                <CardTitle className="text-base text-yellow-700 dark:text-yellow-400">
                  Ya tienen archivo — se omitirán (
                  {filasYaTieneArchivo.length.toLocaleString("es-CO")})
                </CardTitle>
                <CardDescription>
                  El proceso ya tiene un PDF de orden de resolución. Para reemplazarlo,
                  vaya al proceso y elimínelo manualmente.
                  {filasYaTieneArchivo.length > limit &&
                    ` Mostrando los primeros ${limit.toLocaleString("es-CO")}.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border border-yellow-200 dark:border-yellow-900">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Archivo</TableHead>
                        <TableHead>N° Comparendo</TableHead>
                        <TableHead>Proceso / Contribuyente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filasYaTieneArchivo.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                            Ningún proceso tiene archivo previo.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filasYaTieneArchivo.slice(0, limit).map((fila, i) => (
                          <TableRow
                            key={`tiene-${i}`}
                            className="bg-yellow-50/50 dark:bg-yellow-950/20"
                          >
                            <TableCell className="font-mono text-xs">{fila.nombreArchivo}</TableCell>
                            <TableCell className="font-mono text-xs">{fila.noComparendo}</TableCell>
                            <TableCell className="max-w-[220px] truncate">
                              {fila.procesoId != null ? (
                                <Link
                                  href={`/procesos/${fila.procesoId}`}
                                  className="text-primary hover:underline text-sm"
                                >
                                  #{fila.procesoId}
                                  {fila.contribuyenteNombre
                                    ? ` · ${fila.contribuyenteNombre}`
                                    : ""}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Sin match */}
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">
                    Sin match ({filasSinMatch.length.toLocaleString("es-CO")})
                  </CardTitle>
                  <CardDescription>
                    No se encontró ningún proceso con ese número de comparendo en el sistema.
                    {filasSinMatch.length > limit &&
                      ` Mostrando los primeros ${limit.toLocaleString("es-CO")}.`}
                  </CardDescription>
                </div>
                {filasSinMatch.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleDescargarSinMatch} className="shrink-0">
                    <Download className="size-4 mr-2" aria-hidden />
                    Descargar CSV
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Archivo</TableHead>
                        <TableHead>N° Comparendo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filasSinMatch.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                            Todos los archivos tienen match.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filasSinMatch.slice(0, limit).map((fila, i) => (
                          <TableRow key={`nomatch-${i}`}>
                            <TableCell className="font-mono text-xs">{fila.nombreArchivo}</TableCell>
                            <TableCell className="font-mono text-xs">{fila.noComparendo}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        );
      })()}

      {step.type === "done" && (
        <div className="space-y-4">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="size-5" aria-hidden />
                Importación completada
              </CardTitle>
              <CardDescription>
                Los PDFs de orden de resolución fueron adjuntados a los procesos correspondientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Importados</dt>
                  <dd className="font-semibold text-green-600 dark:text-green-400">
                    {step.resultado.importados.toLocaleString("es-CO")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Omitidos</dt>
                  <dd className="font-semibold text-yellow-600 dark:text-yellow-400">
                    {step.resultado.omitidos.toLocaleString("es-CO")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fallidos</dt>
                  <dd className="font-semibold text-destructive">
                    {step.resultado.fallidos.toLocaleString("es-CO")}
                  </dd>
                </div>
              </dl>

              {step.resultado.errores.length > 0 && (
                <div className="mt-4 space-y-1 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
                  <p className="text-sm font-medium text-destructive">Errores registrados:</p>
                  <ul className="text-xs text-destructive/80 space-y-0.5 list-disc list-inside">
                    {step.resultado.errores.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comprobante de importación</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="text-sm">
                <dt className="text-muted-foreground">ID de importación</dt>
                <dd className="font-mono font-semibold">#{step.resultado.importacionId}</dd>
              </dl>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/procesos">Ver procesos</Link>
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Importar otros archivos
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-yellow-500" aria-hidden />
              ¿Confirmar importación de resoluciones?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Se adjuntarán los PDFs a los procesos con match. Si el proceso ya tiene un
                  registro de resolución sin archivo, se actualizará; si no tiene registro,
                  se creará uno nuevo. Los archivos sin match o con archivo previo serán omitidos.
                </p>
                <p className="font-medium text-foreground">¿Desea continuar?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport}>Sí, importar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
