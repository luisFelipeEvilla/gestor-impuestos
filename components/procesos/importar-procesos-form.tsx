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
  previewImportacion,
  ejecutarImportacion,
  type FilaPreview,
  type ImportResult,
} from "@/lib/actions/importar-procesos";

type Step =
  | { type: "idle" }
  | { type: "preview"; filas: FilaPreview[]; totalFilas: number }
  | { type: "done"; resultado: Extract<ImportResult, { ok: true }> };

export function ImportarProcesosForm() {
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
      const result = await previewImportacion(fd);
      if (result.ok) {
        setStep({ type: "preview", filas: result.filas, totalFilas: result.totalFilas });
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
      const result = await ejecutarImportacion(fd);
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

  return (
    <div className="space-y-6">
      {/* ── Step: Upload ──────────────────────────────────────────────────── */}
      {step.type !== "done" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5" aria-hidden />
              Seleccionar archivo
            </CardTitle>
            <CardDescription>
              Formatos aceptados: CSV (separado por punto y coma) o Excel (.xlsx). El archivo debe
              contener las columnas del reporte de cartera de tránsito.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileInputDropzone
              name="archivo"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              placeholder="Arrastre el archivo CSV o Excel aquí, o haga clic para seleccionar"
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
                    <span className="size-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full inline-block" aria-hidden />
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

      {/* ── Step: Preview ────────────────────────────────────────────────── */}
      {step.type === "preview" && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Vista previa</CardTitle>
              <CardDescription>
                Se encontraron{" "}
                <strong>{totalFilas.toLocaleString("es-CO")}</strong> filas en el archivo.
                {totalFilas > 50 && " Mostrando las primeras 50."}
              </CardDescription>
            </div>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={isImporting}
              className="shrink-0"
            >
              {isImporting ? (
                <>
                  <span className="size-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full inline-block" aria-hidden />
                  Importando…
                </>
              ) : (
                "Importar procesos"
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nro Comparendo</TableHead>
                    <TableHead>Nombre Infractor</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado cartera</TableHead>
                    <TableHead>Cobro coactivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {step.filas.map((fila, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{fila.nroComparendo}</TableCell>
                      <TableCell>{fila.nombreInfractor}</TableCell>
                      <TableCell className="font-mono text-xs">{fila.documento}</TableCell>
                      <TableCell>{fila.vigencia ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{fila.montoCop}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            fila.estadoCartera.toLowerCase().includes("coactivo")
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs whitespace-nowrap"
                        >
                          {fila.estadoCartera}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {fila.nroCoactivo !== "-" ? (
                          <span className="font-mono text-xs">{fila.nroCoactivo}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step: Done ──────────────────────────────────────────────────── */}
      {step.type === "done" && (
        <div className="space-y-4">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="size-5" aria-hidden />
                Importación completada
              </CardTitle>
              <CardDescription>
                El archivo fue procesado exitosamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Total filas</dt>
                  <dd className="font-semibold text-foreground">
                    {step.resultado.totalRegistros.toLocaleString("es-CO")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Importados</dt>
                  <dd className="font-semibold text-green-600 dark:text-green-400">
                    {step.resultado.exitosos.toLocaleString("es-CO")}
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

          {/* Proof of import */}
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
                  <dd className="font-mono font-semibold">#{step.resultado.importacionId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Archivo</dt>
                  <dd className="font-medium break-all">{step.resultado.nombreArchivo}</dd>
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

      {/* ── Confirmation modal ───────────────────────────────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-yellow-500" aria-hidden />
              ¿Confirmar importación?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Se procesarán{" "}
                  <strong>{totalFilas.toLocaleString("es-CO")} filas</strong> del archivo{" "}
                  <strong>{archivo?.name}</strong>.
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Los procesos que ya existen en el sistema serán omitidos automáticamente.</li>
                  <li>Los contribuyentes nuevos serán creados si no existen.</li>
                  <li>
                    Esta operación creará registros en la base de datos y{" "}
                    <strong>no se puede deshacer</strong>.
                  </li>
                </ul>
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
