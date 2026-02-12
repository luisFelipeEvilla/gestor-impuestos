"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 p-8 animate-fade-in">
      <div className="rounded-full bg-destructive/10 p-4" aria-hidden>
        <AlertCircle className="size-10 text-destructive" />
      </div>
      <div className="text-center space-y-2 max-w-sm">
        <h2 className="text-lg font-semibold text-foreground">Algo salió mal</h2>
        <p className="text-muted-foreground text-sm">
          Ha ocurrido un error inesperado. Puedes intentar de nuevo o volver al inicio.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} variant="default">
          Reintentar
        </Button>
        <Button asChild variant="outline">
          <a href="/">Ir al inicio</a>
        </Button>
      </div>
    </div>
  );
}
