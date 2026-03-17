"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
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
import { generarMandamiento, firmarMandamiento } from "@/lib/actions/mandamientos-pago";
import type { MandamientoPago } from "@/lib/db/schema";
import { FileText, Loader2, PenLine, Download } from "lucide-react";

type MandamientoConUsuarios = MandamientoPago & {
  generadoPorNombre: string | null;
  firmadoPorNombre: string | null;
};

type Props = {
  procesoId: number;
  mandamientos: MandamientoConUsuarios[];
  puedeGenerar: boolean;
  puedeFirmar: boolean;
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

export function MandamientosPagoSection({ procesoId, mandamientos, puedeGenerar, puedeFirmar }: Props) {
  const [isGenerating, startGenerating] = useTransition();
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [firmarId, setFirmarId] = useState<number | null>(null);

  const handleGenerar = () => {
    setGenerateError(null);
    startGenerating(async () => {
      const result = await generarMandamiento(procesoId);
      if (result.error) setGenerateError(result.error);
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
              onClick={handleGenerar}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <FileText className="mr-2 size-4" />
              )}
              Generar mandamiento
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {generateError && (
            <p className="text-destructive text-sm mb-3">{generateError}</p>
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
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5">
                        Firmado {formatDateTime(m.firmadoEn)}
                        {m.firmadoPorNombre ? ` por ${m.firmadoPorNombre}` : ""}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                        Pendiente de firma
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {firmarId !== null && (
        <FirmarMandamientoDialog
          mandamientoId={firmarId}
          procesoId={procesoId}
          open={true}
          onClose={() => setFirmarId(null)}
        />
      )}
    </>
  );
}
