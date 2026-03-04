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
  Download,
  PlusCircle,
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
  crearProcesosDesdeSinMatch,
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
  const [crearResult, setCrearResult] = React.useState<{
    creados: number;
    omitidos: number;
    errores: string[];
  } | null>(null);
  const [isPreviewing, startPreviewing] = useTransition();
  const [isImporting, startImporting] = useTransition();
  const [isCreating, startCreating] = useTransition();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setArchivo(file);
    setStep({ type: "idle" });
    setErrorMsg(null);
  };

  const handlePreview = () => {
    if (!archivo) return;
    setErrorMsg(null);
    setCrearResult(null);
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

  const descargarCsv = (
    filas: { noComparendo: string; noAcuerdo: string; nombre: string; cuotas: number | null; fechaAcuerdo: string | null; procesoId?: number | null; contribuyenteNombre?: string | null }[],
    nombreArchivo: string,
    conProceso: boolean
  ) => {
    const encabezados = conProceso
      ? ["N° Comparendo", "N° Acuerdo", "Nombre", "Proceso ID", "Contribuyente", "Cuotas", "Fecha acuerdo"]
      : ["N° Comparendo", "N° Acuerdo", "Nombre", "Cuotas", "Fecha acuerdo"];
    const escapar = (v: string | number | null | undefined) => {
      const s = v == null ? "" : String(v);
      return s.includes(";") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const lineas = filas.map((f) => {
      const base = [f.noComparendo, f.noAcuerdo, f.nombre];
      if (conProceso) base.push(String(f.procesoId ?? ""), f.contribuyenteNombre ?? "");
      base.push(String(f.cuotas ?? ""), f.fechaAcuerdo ?? "");
      return base.map(escapar).join(";");
    });
    const csv = [encabezados.join(";"), ...lineas].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombreArchivo}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDescargarSinMatch = () => {
    if (step.type !== "preview") return;
    const filas = step.filas.filter((f) => f.estado === "sin_match");
    descargarCsv(filas, "acuerdos-sin-match", false);
  };

  const handleDescargarDuplicados = () => {
    if (step.type !== "preview") return;
    const filas = step.filas.filter((f) => f.estado === "duplicado");
    descargarCsv(filas, "acuerdos-ya-registrados", true);
  };

  const handleCrearComparendosFaltantes = () => {
    if (step.type !== "preview") return;
    const filasSinMatch = step.filas.filter((f) => f.estado === "sin_match");
    if (filasSinMatch.length === 0) return;
    setCrearResult(null);
    startCreating(async () => {
      const result = await crearProcesosDesdeSinMatch(
        filasSinMatch.map((f) => ({ noComparendo: f.noComparendo, nombre: f.nombre }))
      );
      if (result.ok) {
        setCrearResult({ creados: result.creados, omitidos: result.omitidos, errores: result.errores });
      } else {
        setErrorMsg(result.error);
      }
    });
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
        const filasConMatch = step.filas.filter((f) => f.estado === "match");
        const filasDuplicado = step.filas.filter((f) => f.estado === "duplicado");
        const filasSinMatch = step.filas.filter((f) => f.estado === "sin_match");
        const limit = 100;
        return (
          <>
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>Vista previa</CardTitle>
                  <CardDescription>
                    <strong>{totalFilas.toLocaleString("es-CO")}</strong> filas en total.{" "}
                    A importar: <strong className="text-green-700 dark:text-green-400">{step.resumen.conMatch}</strong>.{" "}
                    Ya registrados: <strong className="text-yellow-700 dark:text-yellow-400">{step.resumen.duplicados}</strong>.{" "}
                    Sin match: <strong className="text-destructive">{step.resumen.sinMatch}</strong>.
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

            {/* Tabla: a importar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  A importar ({filasConMatch.length.toLocaleString("es-CO")})
                </CardTitle>
                <CardDescription>
                  Acuerdos que coinciden con un proceso sin acuerdo previo y serán importados.
                  {filasConMatch.length > limit &&
                    ` Mostrando los primeros ${limit.toLocaleString("es-CO")}.`}
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
                        <TableHead>Proceso / Contribuyente</TableHead>
                        <TableHead>Cuotas</TableHead>
                        <TableHead>Fecha acuerdo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filasConMatch.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                            No hay acuerdos nuevos para importar.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filasConMatch.slice(0, limit).map((fila, i) => (
                          <TableRow key={`match-${i}`}>
                            <TableCell className="font-mono text-xs">
                              {fila.noComparendo}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {fila.noAcuerdo || "—"}
                            </TableCell>
                            <TableCell>{fila.nombre || "—"}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {fila.procesoId != null ? (
                                <Link
                                  href={`/comparendos/${fila.procesoId}`}
                                  className="text-primary hover:underline text-sm"
                                >
                                  #{fila.procesoId}
                                  {fila.contribuyenteNombre ? ` · ${fila.contribuyenteNombre}` : ""}
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
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Tabla: ya registrados (duplicados) */}
            <Card className="border-yellow-200 dark:border-yellow-900">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base text-yellow-700 dark:text-yellow-400">
                    Ya registrados — se omitirán ({filasDuplicado.length.toLocaleString("es-CO")})
                  </CardTitle>
                  <CardDescription>
                    El comparendo ya tiene un acuerdo de pago en el sistema. No se importarán.
                    {filasDuplicado.length > limit &&
                      ` Mostrando los primeros ${limit.toLocaleString("es-CO")}.`}
                  </CardDescription>
                </div>
                {filasDuplicado.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDescargarDuplicados}
                    className="shrink-0"
                  >
                    <Download className="size-4 mr-2" aria-hidden />
                    Descargar CSV
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border border-yellow-200 dark:border-yellow-900">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Comparendo</TableHead>
                        <TableHead>N° acuerdo</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Proceso / Contribuyente</TableHead>
                        <TableHead>Cuotas</TableHead>
                        <TableHead>Fecha acuerdo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filasDuplicado.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                            Ningún comparendo tiene acuerdo previo.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filasDuplicado.slice(0, limit).map((fila, i) => (
                          <TableRow key={`dup-${i}`} className="bg-yellow-50/50 dark:bg-yellow-950/20">
                            <TableCell className="font-mono text-xs">
                              {fila.noComparendo}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {fila.noAcuerdo || "—"}
                            </TableCell>
                            <TableCell>{fila.nombre || "—"}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {fila.procesoId != null ? (
                                <Link
                                  href={`/comparendos/${fila.procesoId}`}
                                  className="text-primary hover:underline text-sm"
                                >
                                  #{fila.procesoId}
                                  {fila.contribuyenteNombre ? ` · ${fila.contribuyenteNombre}` : ""}
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
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Tabla: sin match */}
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">
                    Sin match ({filasSinMatch.length.toLocaleString("es-CO")})
                  </CardTitle>
                  <CardDescription>
                    Acuerdos cuyo número de comparendo no coincide con ningún proceso en el
                    sistema. Puede crear los comparendos faltantes y luego previsualizar de nuevo para importarlos.
                    {filasSinMatch.length > limit &&
                      ` Mostrando los primeros ${limit.toLocaleString("es-CO")}.`}
                  </CardDescription>
                </div>
                {filasSinMatch.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleCrearComparendosFaltantes}
                      disabled={isCreating}
                      className="gap-1.5"
                    >
                      {isCreating ? (
                        <>
                          <span
                            className="size-4 animate-spin border-2 border-current border-t-transparent rounded-full inline-block"
                            aria-hidden
                          />
                          Creando…
                        </>
                      ) : (
                        <>
                          <PlusCircle className="size-4" aria-hidden />
                          Crear comparendos faltantes
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDescargarSinMatch}
                      disabled={isCreating}
                    >
                      <Download className="size-4 mr-2" aria-hidden />
                      Descargar CSV
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {crearResult != null && (
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      crearResult.creados > 0
                        ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
                        : "border-muted bg-muted/30"
                    }`}
                  >
                    <p className="font-medium text-foreground">
                      {crearResult.creados > 0 ? (
                        <>Se crearon {crearResult.creados.toLocaleString("es-CO")} comparendo(s).</>
                      ) : crearResult.omitidos > 0 ? (
                        <>Todos los comparendos ya existían ({crearResult.omitidos} omitidos).</>
                      ) : (
                        "No se crearon procesos (ya existían o no había filas)."
                      )}
                    </p>
                    {crearResult.creados > 0 && (
                      <p className="mt-1 text-muted-foreground">
                        Haga clic en <strong>Previsualizar</strong> de nuevo para actualizar la vista; los acuerdos de esos comparendos pasarán a &quot;A importar&quot; y podrá importarlos.
                      </p>
                    )}
                    {crearResult.errores.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-destructive text-xs space-y-0.5">
                        {crearResult.errores.slice(0, 5).map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                        {crearResult.errores.length > 5 && (
                          <li>… y {crearResult.errores.length - 5} más</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
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
                      {filasSinMatch.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                            Todos los comparendos tienen match.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filasSinMatch.slice(0, limit).map((fila, i) => (
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
              <Link href="/comparendos">Ver procesos</Link>
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
