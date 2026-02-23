"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const AÑO_MIN = 2000;
const AÑO_MAX = new Date().getFullYear() + 2;
const OPCIONES_VIGENCIA = Array.from(
  { length: AÑO_MAX - AÑO_MIN + 1 },
  (_, i) => AÑO_MIN + i
).reverse();

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "asignado", label: "Asignado" },
  { value: "facturacion", label: "Facturación" },
  { value: "acuerdo_pago", label: "Acuerdo de pago" },
  { value: "en_cobro_coactivo", label: "Cobro coactivo" },
  { value: "finalizado", label: "Finalizado" },
] as const;

type UsuarioOption = { id: number; nombre: string };

type DashboardFiltrosProps = {
  vigenciaActual: number | null;
  estadoActual: string | null;
  asignadoIdActual: number | null;
  usuarios: UsuarioOption[];
};

export function DashboardFiltros({
  vigenciaActual,
  estadoActual,
  asignadoIdActual,
  usuarios: usuariosList,
}: DashboardFiltrosProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const buildParams = useCallback(
    (updates: {
      vigencia?: string | number | null;
      estado?: string | null;
      asignadoId?: number | null;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      const vig = updates.vigencia !== undefined ? updates.vigencia : vigenciaActual;
      const est = updates.estado !== undefined ? updates.estado : estadoActual;
      const asig = updates.asignadoId !== undefined ? updates.asignadoId : asignadoIdActual;
      params.delete("vigencia");
      params.delete("estado");
      params.delete("asignado");
      if (vig != null) params.set("vigencia", String(vig));
      if (est != null && est !== "todos") params.set("estado", est);
      if (asig != null && asig > 0) params.set("asignado", String(asig));
      return params;
    },
    [searchParams, vigenciaActual, estadoActual, asignadoIdActual]
  );

  const handleVigenciaChange = useCallback(
    (value: string) => {
      const params = buildParams({
        vigencia: value === "todos" ? null : parseInt(value, 10),
      });
      router.push(`/?${params.toString()}`);
    },
    [router, buildParams]
  );

  const handleEstadoChange = useCallback(
    (value: string) => {
      const params = buildParams({
        estado: value === "todos" ? null : value,
      });
      router.push(`/?${params.toString()}`);
    },
    [router, buildParams]
  );

  const handleAsignadoChange = useCallback(
    (value: string) => {
      const params = buildParams({
        asignadoId: value === "todos" ? null : parseInt(value, 10),
      });
      router.push(`/?${params.toString()}`);
    },
    [router, buildParams]
  );

  const handleLimpiar = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleRefresh = useCallback((): void => {
    router.refresh();
  }, [router]);

  const tieneFiltros =
    vigenciaActual != null ||
    (estadoActual != null && estadoActual !== "todos") ||
    (asignadoIdActual != null && asignadoIdActual > 0);

  const fieldClass = "min-w-0 w-[140px]";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dashboard-vigencia" className="text-xs text-muted-foreground">
          Vigencia
        </Label>
        <Select
          value={vigenciaActual?.toString() ?? "todos"}
          onValueChange={handleVigenciaChange}
        >
          <SelectTrigger id="dashboard-vigencia" className={fieldClass}>
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dashboard-estado" className="text-xs text-muted-foreground">
          Estado
        </Label>
        <Select
          value={estadoActual ?? "todos"}
          onValueChange={handleEstadoChange}
        >
          <SelectTrigger id="dashboard-estado" className={fieldClass}>
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
        <Label htmlFor="dashboard-asignado" className="text-xs text-muted-foreground">
          Persona asignada
        </Label>
        <Select
          value={asignadoIdActual != null ? String(asignadoIdActual) : "todos"}
          onValueChange={handleAsignadoChange}
        >
          <SelectTrigger id="dashboard-asignado" className={fieldClass}>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {usuariosList.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.nombre}
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
          className="gap-1 h-9"
        >
          <X className="size-4" aria-hidden />
          Limpiar
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        aria-label="Refrescar información del dashboard"
        className="gap-2 h-9"
      >
        <RefreshCw className="size-4" aria-hidden />
        Refrescar
      </Button>
    </div>
  );
}
