"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

type FormAprobarConFotoProps = {
  actaId: number;
  integranteId: number;
  firmaParam: string;
  submitAction: (prev: unknown, formData: FormData) => Promise<void>;
};

export function FormAprobarConFoto({
  actaId,
  integranteId,
  firmaParam,
  submitAction,
}: FormAprobarConFotoProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasPhoto = !!capturedBlob || !!selectedFile;

  const previewUrl = useMemo(() => {
    if (capturedBlob) return URL.createObjectURL(capturedBlob);
    if (selectedFile) return URL.createObjectURL(selectedFile);
    return null;
  }, [capturedBlob, selectedFile]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleOpenCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo acceder a la cámara.";
      setCameraError(message);
    }
  }, []);

  const handleCloseCamera = useCallback(() => {
    stopCamera();
    setCameraOpen(false);
    setCameraError(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stopCamera]);

  const handleCapturar = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
        handleCloseCamera();
      },
      "image/jpeg",
      0.9
    );
  }, [handleCloseCamera]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCapturedBlob(null);
    }
  }, []);

  const handleRemovePhoto = useCallback(() => {
    setCapturedBlob(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      let file: File | null = null;
      if (capturedBlob) {
        file = new File([capturedBlob], "foto.jpg", { type: "image/jpeg" });
      } else if (selectedFile) {
        file = selectedFile;
      }
      if (!file) return;
      const formData = new FormData();
      formData.set("actaId", String(actaId));
      formData.set("integranteId", String(integranteId));
      formData.set("firma", firmaParam);
      formData.set("foto", file);
      setIsSubmitting(true);
      try {
        await submitAction(null, formData);
      } finally {
        setIsSubmitting(false);
      }
    },
    [actaId, integranteId, firmaParam, capturedBlob, selectedFile, submitAction]
  );

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input type="hidden" name="actaId" value={actaId} readOnly aria-hidden />
        <input type="hidden" name="integranteId" value={integranteId} readOnly aria-hidden />
        <input type="hidden" name="firma" value={firmaParam} readOnly aria-hidden />

        <div className="grid gap-2">
          <span className="text-sm font-medium">
            Fotografía <span className="text-destructive">*</span>
          </span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenCamera}
              className="inline-flex items-center gap-2"
              aria-label="Abrir cámara para tomar foto"
            >
              <Camera className="h-4 w-4" />
              Tomar foto con la cámara
            </Button>
            <span className="text-muted-foreground text-sm">o</span>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                id="foto"
                name="foto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="border-input bg-background file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 w-full max-w-xs rounded-md border px-3 py-2 text-sm shadow-xs"
                aria-describedby="foto-hint"
              />
              <span className="text-muted-foreground text-xs hidden sm:inline">Elegir archivo</span>
            </div>
          </div>
          {cameraError && (
            <p className="text-destructive text-sm" role="alert">
              {cameraError}
            </p>
          )}
          <p id="foto-hint" className="text-muted-foreground text-xs">
            Tome una foto con la cámara o seleccione una imagen (JPEG, PNG o WebP, máx. 5 MB).
          </p>
        </div>

        {hasPhoto && previewUrl && (
          <div className="relative inline-block">
            <div className="rounded-md border border-border bg-muted/30 p-2">
              <img
                src={previewUrl}
                alt="Vista previa de la foto"
                className="max-h-48 rounded object-contain"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleRemovePhoto}
              aria-label="Quitar foto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Button
          type="submit"
          variant="default"
          size="lg"
          className="w-full sm:w-auto"
          disabled={!hasPhoto || isSubmitting}
        >
          {isSubmitting ? "Enviando…" : "Confirmar que he leído y aprobado este acta"}
        </Button>
      </form>

      {cameraOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="camera-title"
        >
          <div className="bg-background border-border flex w-full max-w-lg flex-col gap-4 rounded-lg border p-4 shadow-lg">
            <h2 id="camera-title" className="text-lg font-semibold">
              Tomar foto
            </h2>
            <p className="text-muted-foreground text-sm">
              Coloque el rostro o el documento en el recuadro y pulse Capturar.
            </p>
            <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseCamera}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleCapturar}>
                Capturar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
