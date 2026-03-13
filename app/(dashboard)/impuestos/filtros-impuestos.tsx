"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "declarado", label: "Declarado" },
  { value: "liquidado", label: "Liquidado" },
  { value: "notificado", label: "Notificado" },
  { value: "en_cobro_coactivo", label: "Cobro coactivo" },
  { value: "pagado", label: "Pagado" },
  { value: "cerrado", label: "Cerrado" },
] as const;

const AÑO_MIN = 2000;
const AÑO_MAX = new Date().getFullYear() + 1;
const OPCIONES_VIGENCIA = Array.from(
  { length: AÑO_MAX - AÑO_MIN + 1 },
  (_, i) => AÑO_MIN + i
).reverse();

type FiltrosImpuestosProps = {
  estadoActual: string | null;
  vigenciaActual: number | null;
  busquedaActual: string;
};

export function FiltrosImpuestos({
  estadoActual,
  vigenciaActual,
  busquedaActual,
}: FiltrosImpuestosProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busqueda, setBusqueda] = useState(busquedaActual);

  useEffect(() => {
    setBusqueda(busquedaActual);
  }, [busquedaActual]);

  const buildParams = useCallback(
    (updates: {
      estado?: string | null;
      vigencia?: number | string | null;
      q?: string | null;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      const estado = updates.estado !== undefined ? updates.estado : estadoActual;
      const vigencia = updates.vigencia !== undefined ? updates.vigencia : vigenciaActual;
      const q = updates.q !== undefined ? updates.q : busquedaActual;
      params.delete("estado");
      params.delete("vigencia");
      params.delete("q");
      params.delete("page");
      if (estado != null && estado !== "todos") params.set("estado", estado);
      if (vigencia != null && vigencia !== "todos") params.set("vigencia", String(vigencia));
      if (q?.trim()) params.set("q", q.trim());
      return params;
    },
    [searchParams, estadoActual, vigenciaActual, busquedaActual]
  );

  const handleEstadoChange = useCallback(
    (value: string) => {
      const params = buildParams({ estado: value === "todos" ? null : value });
      router.push(`/impuestos?${params.toString()}`);
    },
    [router, buildParams]
  );

  const handleVigenciaChange = useCallback(
    (value: string) => {
      const params = buildParams({ vigencia: value === "todos" ? null : parseInt(value, 10) });
      router.push(`/impuestos?${params.toString()}`);
    },
    [router, buildParams]
  );

  const handleBusquedaSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const params = buildParams({ q: busqueda || null });
      const str = params.toString();
      router.push(`/impuestos${str ? `?${str}` : ""}`);
    },
    [router, buildParams, busqueda]
  );

  const handleLimpiar = useCallback(() => {
    setBusqueda("");
    router.push("/impuestos");
  }, [router]);

  const tieneFiltros =
    estadoActual != null || vigenciaActual != null || busquedaActual.length > 0;

  const fieldClass = "min-w-0 w-full h-10";

  return (
    <Card className="w-full min-w-0 border-border/80 py-5 px-5">
      <CardContent className="p-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-5 items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filtro-estado-imp" className="text-xs text-muted-foreground">
              Estado
            </Label>
            <Select value={estadoActual ?? "todos"} onValueChange={handleEstadoChange}>
              <SelectTrigger id="filtro-estado-imp" className={fieldClass}>
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
            <Label htmlFor="filtro-vigencia-imp" className="text-xs text-muted-foreground">
              Vigencia
            </Label>
            <Select
              value={vigenciaActual?.toString() ?? "todos"}
              onValueChange={handleVigenciaChange}
            >
              <SelectTrigger id="filtro-vigencia-imp" className={fieldClass}>
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

          <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="filtro-busqueda-imp" className="text-xs text-muted-foreground">
              Búsqueda
            </Label>
            <form onSubmit={handleBusquedaSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="filtro-busqueda-imp"
                  type="search"
                  placeholder="Contribuyente, NIT, expediente..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-8 h-10 w-full"
                />
              </div>
              <Button type="submit" variant="secondary" size="icon" className="h-10 w-10 shrink-0">
                <Search className="size-4" aria-hidden />
              </Button>
            </form>
          </div>

          <div className="flex items-end">
            {tieneFiltros && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLimpiar}
                aria-label="Limpiar filtros"
                className="h-10 gap-1"
              >
                <X className="size-4" aria-hidden />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
