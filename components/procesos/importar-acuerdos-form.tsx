"use client";

import * as React from "react";
import { useTransition } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Upload,
  RotateCcw,
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
import { Badge } from "@/components/ui/badge";
import { FileInputDropzone } from "@/components/ui/file-input-dropzone";
import {
  previewImportacionAcuerdos,
  ejecutarImportacionAcuerdos,
  type FilaPreviewAcuerdo,
  type ImportAcuerdosResult,
} from "@/lib/actions/importar-acuerdos";

type Step =
  | { type: "idle" }
  | {
      type: "preview";
      filas: FilaPreviewAcuerdo[];
      totalFilas: number;
      resumen: { conMatch: number; sinMatch: number; duplicados: number };
    }
  | { type: "done"; resultado: Extract<ImportAcuerdosResult, { ok: true }> };

function estadoLabel(estado: FilaPreviewAcuerdo["estado"]): string {
  switch (estado) {
    case "match":
      return "Match";
    case "sin_match":
      return "Sin match";
    case "duplicado":
      return "Duplicado";
    default:
      return estado;
  }
}

function estadoVariant(
  estado: FilaPreviewAcuerdo["estado"]
): "default" | "secondary" | "destructive" | "outline" {
  switch (estado) {
    case "match":
      return "default";
    case "sin_match":
      return "destructive";
    case "duplicado":
      return "secondary";
    default:
      return "outline";
  }
}

export function ImportarAcuerdosForm() {
  const [step, setStep] = React.useState<Step>({ type: "idle" });
  const [archivo, setArchivo] = React.useState<File | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isPreviewing, startPreviewing] = useTransition();
  const [isImporting, startImporting] = useTransition();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setArchivo(file);
    setStep({ type: "idle" });
    setErrorMsg(null);
  };

  const handlePreview = () => {
    if (!archivo) return;
    setErrorMsg(null);
    startPreviewing(async () => {
      const fd = new FormData();
      fd.append("archivo", archivo);
      const result = await previewImportacionAcuerdos(fd);
      if (result.ok) {
        setStep({
          type: "preview",
          filas: result.filas,
          totalFilas: result.totalFilas,
          resumen: result.resumen,
        });
      } else {
        setErrorMsg(result.error);
      }
    });
  };

  const handleConfirmImport = () => {
    if (!archivo) return;
    setConfirmOpen(false);
    startImporting(async () => {
      const fd = new FormData();
      fd.append("archivo", archivo);
      const result = await ejecutarImportacionAcuerdos(fd);
      if (result.ok) {
        setStep({ type: "done", resultado: result });
      } else {
        setErrorMsg(result.error);
      }
    });
  };

  const handleReset = () => {
    setStep({ type: "idle" });
    setArchivo(null);
    setErrorMsg(null);
  };

  const totalFilas = step.type === "preview" ? step.totalFilas : 0;
  const puedeImportar =
    step.type === "preview" && step.resumen.conMatch > 0 && !isImporting;

  return (
    <div className="space-y-6">
      {step.type !== "done" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5" aria-hidden />
              Seleccionar archivo
            </CardTitle>
            <CardDescription>
              CSV (separado por punto y coma) con acuerdos de pago. Debe incluir columnas: N°
              Comparendo, N° acuerdo, Fecha acuerdo, N° cuotas, Fecha cuota inicial, % CUOTA
              INICIAL y Fecha Inicio preescripcion (opcional, para actualizar fecha de prescripción).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileInputDropzone
              name="archivo"
              accept=".csv"
              onChange={handleFileChange}
              placeholder="Arrastre el archivo CSV aquí o haga clic para seleccionar"
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
                disabled={!archivo || isPreviewing || isImporting}
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
                  Cambiar archivo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step.type === "preview" && (() => {
        const filasConMatch = step.filas.filter(
          (f) => f.estado === "match" || f.estado === "duplicado"
        );
        const filasSinMatch = step.filas.filter((f) => f.estado === "sin_match");
        const limit = 100;
        return (
          <>
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>Vista previa</CardTitle>
                  <CardDescription>
                    <strong>{totalFilas.toLocaleString("es-CO")}</strong> filas en total. Con
                    match: <strong>{step.resumen.conMatch + step.resumen.duplicados}</strong> (a
                    importar: {step.resumen.conMatch}, duplicados: {step.resumen.duplicados}).
                    Sin match: <strong>{step.resumen.sinMatch}</strong>.
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
                    "Importar acuerdos"
                  )}
                </Button>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Con match ({filasConMatch.length.toLocaleString("es-CO")})
                </CardTitle>
                <CardDescription>
                  Acuerdos que coinciden con un proceso en el sistema.
                  {filasConMatch.length > limit &&
                    ` Mostrando las primeras ${limit.toLocaleString("es-CO")}.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Comparendo</TableHead>
                        <TableHead>N° acuerdo</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Proceso / Contribuyente</TableHead>
                        <TableHead>Cuotas</TableHead>
                        <TableHead>Fecha acuerdo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filasConMatch.slice(0, limit).map((fila, i) => (
                        <TableRow key={`match-${i}`}>
                          <TableCell className="font-mono text-xs">
                            {fila.noComparendo}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {fila.noAcuerdo || "—"}
                          </TableCell>
                          <TableCell>{fila.nombre || "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={estadoVariant(fila.estado)}
                              className="text-xs"
                            >
                              {estadoLabel(fila.estado)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
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
                          <TableCell>{fila.cuotas ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {fila.fechaAcuerdo ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Sin match ({filasSinMatch.length.toLocaleString("es-CO")})
                </CardTitle>
                <CardDescription>
                  Acuerdos cuyo número de comparendo no coincide con ningún proceso en el
                  sistema. No se importarán.
                  {filasSinMatch.length > limit &&
                    ` Mostrando las primeras ${limit.toLocaleString("es-CO")}.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Comparendo</TableHead>
                        <TableHead>N° acuerdo</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Cuotas</TableHead>
                        <TableHead>Fecha acuerdo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filasSinMatch.slice(0, limit).map((fila, i) => (
                        <TableRow key={`nomatch-${i}`}>
                          <TableCell className="font-mono text-xs">
                            {fila.noComparendo}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {fila.noAcuerdo || "—"}
                          </TableCell>
                          <TableCell>{fila.nombre || "—"}</TableCell>
                          <TableCell>{fila.cuotas ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {fila.fechaAcuerdo ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
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
                Acuerdos de pago importados. Se actualizó el estado a &quot;Acuerdo de pago&quot;,
                la fecha de prescripción cuando aplica y se crearon las cuotas (pendientes) por acuerdo.
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
                  <p className="text-sm font-medium text-destructive">
                    Errores registrados:
                  </p>
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
              <CardDescription>
                Registro de auditoría de esta operación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">ID de importación</dt>
                  <dd className="font-mono font-semibold">
                    #{step.resultado.importacionId}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Archivo</dt>
                  <dd className="font-medium break-all">
                    {step.resultado.nombreArchivo}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/procesos">Ver procesos</Link>
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Importar otro archivo
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-yellow-500" aria-hidden />
              ¿Confirmar importación de acuerdos?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Se importarán los acuerdos que tienen match con un proceso y no están
                  duplicados. La fecha de prescripción de cada proceso se actualizará con
                  "Fecha Inicio preescripcion" del CSV cuando venga informada.
                </p>
                <p className="font-medium text-foreground">¿Desea continuar?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport}>
              Sí, importar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
