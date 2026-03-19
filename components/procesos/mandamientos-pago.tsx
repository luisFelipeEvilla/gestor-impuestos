"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { generarMandamiento, firmarMandamiento, eliminarMandamiento } from "@/lib/actions/mandamientos-pago";
import type { MandamientoPago } from "@/lib/db/schema";
import { AlertTriangle, FileText, Loader2, PenLine, Download, Trash2, Info } from "lucide-react";

type MandamientoConUsuarios = MandamientoPago & {
  generadoPorNombre: string | null;
  firmadoPorNombre: string | null;
};

type Props = {
  procesoId: number;
  mandamientos: MandamientoConUsuarios[];
  puedeGenerar: boolean;
  puedeFirmar: boolean;
  puedeEliminar: boolean;
  /** Puede eliminar mandamientos que aún no han sido firmados */
  puedeEliminarSinFirmar?: boolean;
  vehiculoPlacaDefault?: string | null;
  /** Campos del contribuyente que faltan y aparecerán vacíos en el documento */
  camposFaltantes?: string[];
};

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        dateStyle: "short",
        timeStyle: "short",
      });
}

function FirmarMandamientoDialog({
  mandamientoId,
  procesoId,
  open,
  onClose,
}: {
  mandamientoId: number;
  procesoId: number;
  open: boolean;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setError(null);
  };

  const handleClose = () => {
    setError(null);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  };

  const handleConfirm = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona una imagen de firma");
      return;
    }
    const formData = new FormData();
    formData.append("firma", file);
    setError(null);
    startTransition(async () => {
      const result = await firmarMandamiento(mandamientoId, formData);
      if (result.error) {
        setError(result.error);
      } else {
        handleClose();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Firmar mandamiento de pago</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Sube una imagen PNG o JPG de la firma. Quedará estampada debajo de
            &quot;NOTIFÍQUESE Y CÚMPLASE&quot; en el PDF.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleFileChange}
            className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted/80"
            disabled={isPending}
          />
          {previewUrl && (
            <div className="rounded-md border bg-muted/30 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview firma"
                className="max-h-24 w-full object-contain"
              />
            </div>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Confirmar firma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MandamientosPagoSection({ procesoId, mandamientos, puedeGenerar, puedeFirmar, puedeEliminar, puedeEliminarSinFirmar, vehiculoPlacaDefault, camposFaltantes }: Props) {
  const [isGenerating, startGenerating] = useTransition();
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [showGenerarDialog, setShowGenerarDialog] = useState(false);
  const [confirmarConFaltantes, setConfirmarConFaltantes] = useState(false);
  const [firmarId, setFirmarId] = useState<number | null>(null);
  const [eliminarId, setEliminarId] = useState<number | null>(null);
  const [isDeleting, startDeleting] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const tieneVehiculo = !!vehiculoPlacaDefault;

  const handleEliminarConfirm = () => {
    if (eliminarId === null) return;
    setDeleteError(null);
    startDeleting(async () => {
      const result = await eliminarMandamiento(eliminarId);
      if (result.error) {
        setDeleteError(result.error);
      } else {
        setEliminarId(null);
      }
    });
  };

  const tieneCamposFaltantes = (camposFaltantes?.length ?? 0) > 0;

  const handleAbrirDialogGenerar = () => {
    setGenerateError(null);
    setConfirmarConFaltantes(false);
    setShowGenerarDialog(true);
  };

  const handleConfirmarGenerar = () => {
    setGenerateError(null);
    startGenerating(async () => {
      const result = await generarMandamiento(procesoId, vehiculoPlacaDefault ?? "");
      if (result.error) {
        setGenerateError(result.error);
      } else {
        setShowGenerarDialog(false);
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Mandamientos de pago</CardTitle>
            <CardDescription>
              PDFs generados y firmados electrónicamente para este proceso.
            </CardDescription>
          </div>
          {puedeGenerar && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAbrirDialogGenerar}
              disabled={mandamientos.length > 0 || !tieneVehiculo}
              title={
                mandamientos.length > 0
                  ? "Ya existe un mandamiento de pago para este proceso"
                  : !tieneVehiculo
                  ? "Asigna un vehículo al comparendo antes de generar"
                  : undefined
              }
            >
              <FileText className="mr-2 size-4" />
              Generar mandamiento
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {generateError && (
            <p className="text-destructive text-sm mb-3">{generateError}</p>
          )}
          {puedeGenerar && !tieneVehiculo && (
            <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-3 mb-4">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300">Sin vehículo asignado</p>
                <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                  Este comparendo no tiene un vehículo registrado. Asigna uno para poder generar el mandamiento de pago.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link href={`/comparendos/${procesoId}/editar`}>
                    Asignar vehículo
                  </Link>
                </Button>
              </div>
            </div>
          )}
          {mandamientos.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay mandamientos generados aún.
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {mandamientos.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{m.nombreOriginal}</p>
                    <p className="text-muted-foreground text-xs">
                      Generado {formatDateTime(m.creadoEn)}
                      {m.generadoPorNombre ? ` por ${m.generadoPorNombre}` : ""}
                    </p>
                    {m.firmadoEn ? (
                      <>
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5">
                          Firmado {formatDateTime(m.firmadoEn)}
                          {m.firmadoPorNombre ? ` por ${m.firmadoPorNombre}` : ""}
                        </p>
                        {m.consecutivo != null && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Nº Resolución: <span className="font-medium">{m.consecutivo}</span>
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                        Pendiente de firma — Nº Resolución se asignará al firmar
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={`/api/comparendos/${procesoId}/mandamiento-pago/${m.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="size-4" />
                        <span className="sr-only">Descargar</span>
                      </a>
                    </Button>
                    {puedeFirmar && !m.firmadoEn && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFirmarId(m.id)}
                      >
                        <PenLine className="mr-1.5 size-4" />
                        Firmar
                      </Button>
                    )}
                    {(puedeEliminar || (puedeEliminarSinFirmar && !m.firmadoEn)) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => { setDeleteError(null); setEliminarId(m.id); }}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showGenerarDialog} onOpenChange={(v) => { if (!v && !isGenerating) setShowGenerarDialog(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Generar mandamiento de pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Placa del vehículo</Label>
              <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm font-mono">
                {vehiculoPlacaDefault}
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-md border border-muted bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <Info className="size-3.5 shrink-0 mt-0.5" />
              <span>El Nº de Resolución (consecutivo) se asignará automáticamente al momento de firmar.</span>
            </div>
            {tieneCamposFaltantes && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-300">Datos incompletos del contribuyente</p>
                    <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                      Los siguientes campos no están registrados y quedarán vacíos en el documento:
                    </p>
                    <ul className="mt-1 list-disc list-inside text-amber-700 dark:text-amber-400">
                      {camposFaltantes!.map((campo) => (
                        <li key={campo}>{campo}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none pl-6">
                  <input
                    type="checkbox"
                    checked={confirmarConFaltantes}
                    onChange={(e) => setConfirmarConFaltantes(e.target.checked)}
                    className="accent-amber-600"
                  />
                  <span className="text-sm text-amber-800 dark:text-amber-300">
                    Entiendo y deseo continuar de todas formas
                  </span>
                </label>
              </div>
            )}
            {generateError && <p className="text-destructive text-sm">{generateError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerarDialog(false)} disabled={isGenerating}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarGenerar}
              disabled={isGenerating || (tieneCamposFaltantes && !confirmarConFaltantes)}
            >
              {isGenerating && <Loader2 className="mr-2 size-4 animate-spin" />}
              Generar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {firmarId !== null && (
        <FirmarMandamientoDialog
          mandamientoId={firmarId}
          procesoId={procesoId}
          open={true}
          onClose={() => setFirmarId(null)}
        />
      )}

      <AlertDialog open={eliminarId !== null} onOpenChange={(v) => { if (!v) setEliminarId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar mandamiento de pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el documento PDF de forma permanente. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-destructive text-sm px-1">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminarConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
