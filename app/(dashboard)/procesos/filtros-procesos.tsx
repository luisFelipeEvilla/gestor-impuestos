"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "asignado", label: "Asignado" },
  { value: "notificado", label: "Notificado" },
  { value: "en_contacto", label: "En contacto" },
  { value: "en_negociacion", label: "En negociación" },
  { value: "en_cobro_coactivo", label: "En cobro coactivo" },
  { value: "cobrado", label: "Cobrado" },
  { value: "incobrable", label: "Incobrable" },
  { value: "suspendido", label: "Suspendido" },
] as const;

const AÑO_MIN = 2000;
const AÑO_MAX = new Date().getFullYear() + 2;
const OPCIONES_VIGENCIA = Array.from(
  { length: AÑO_MAX - AÑO_MIN + 1 },
  (_, i) => AÑO_MIN + i
).reverse();

type FiltrosProcesosProps = {
  estadoActual: string | null;
  vigenciaActual: number | null;
};

export function FiltrosProcesos({
  estadoActual,
  vigenciaActual,
}: FiltrosProcesosProps): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleEstadoChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "todos") {
        params.delete("estado");
      } else {
        params.set("estado", value);
      }
      router.push(`/procesos?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleVigenciaChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "todos") {
        params.delete("vigencia");
      } else {
        params.set("vigencia", value);
      }
      router.push(`/procesos?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleLimpiar = useCallback(() => {
    router.push("/procesos");
  }, [router]);

  const tieneFiltros = estadoActual != null || vigenciaActual != null;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filtro-estado" className="text-xs text-muted-foreground">
          Estado
        </Label>
        <Select
          value={estadoActual ?? "todos"}
          onValueChange={handleEstadoChange}
        >
          <SelectTrigger id="filtro-estado" className="w-[160px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {ESTADOS.map((e) => (
              <SelectItem key={e.value} value={e.value}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filtro-vigencia" className="text-xs text-muted-foreground">
          Vigencia
        </Label>
        <Select
          value={vigenciaActual?.toString() ?? "todos"}
          onValueChange={handleVigenciaChange}
        >
          <SelectTrigger id="filtro-vigencia" className="w-[120px]">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {OPCIONES_VIGENCIA.map((año) => (
              <SelectItem key={año} value={año.toString()}>
                {año}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {tieneFiltros && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLimpiar}
          aria-label="Limpiar filtros"
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
