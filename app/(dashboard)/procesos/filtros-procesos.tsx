"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "asignado", label: "Asignado" },
  { value: "facturacion", label: "Facturación" },
  { value: "acuerdo_pago", label: "Acuerdo de pago" },
  { value: "en_cobro_coactivo", label: "Cobro coactivo" },
  { value: "finalizado", label: "Finalizado" },
] as const;

const AÑO_MIN = 2000;
const AÑO_MAX = new Date().getFullYear() + 2;
const OPCIONES_VIGENCIA = Array.from(
  { length: AÑO_MAX - AÑO_MIN + 1 },
  (_, i) => AÑO_MIN + i
).reverse();

/** Opciones de antigüedad según fecha límite de prescripción (igual que columna Antigüedad) */
const OPCIONES_ANTIGUEDAD = [
  { value: "todos", label: "Todas" },
  { value: "en_plazo", label: "En plazo" },
  { value: "prescripcion_cercana", label: "Prescripción cercana" },
  { value: "prescripcion_muy_cercana", label: "Prescripción muy cercana" },
  { value: "prescrito", label: "Prescrito" },
  { value: "sin_fecha", label: "Sin fecha límite" },
] as const;

type UsuarioOption = { id: number; nombre: string };

type FiltrosProcesosProps = {
  estadoActual: string | null;
  vigenciaActual: number | null;
  antiguedadActual: string | null;
  usuarios: UsuarioOption[];
  asignadoIdActual: number | null;
  fechaAsignacionActual: string | null;
};

export function FiltrosProcesos({
  estadoActual,
  vigenciaActual,
  antiguedadActual,
  usuarios: usuariosList,
  asignadoIdActual,
  fechaAsignacionActual,
}: FiltrosProcesosProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const buildParams = useCallback(
    (updates: {
      estado?: string | null;
      vigencia?: string | number | null;
      antiguedad?: string | null;
      asignadoId?: number | null;
      fechaAsignacion?: string | null;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      const estado =
        updates.estado !== undefined ? updates.estado : estadoActual;
      const vigencia =
        updates.vigencia !== undefined ? updates.vigencia : vigenciaActual;
      const antig =
        updates.antiguedad !== undefined ? updates.antiguedad : antiguedadActual;
      const asigId =
        updates.asignadoId !== undefined
          ? updates.asignadoId
          : asignadoIdActual;
      const fechaAsig =
        updates.fechaAsignacion !== undefined
          ? updates.fechaAsignacion
          : fechaAsignacionActual;

      params.delete("estado");
      params.delete("vigencia");
      params.delete("antiguedad");
      params.delete("asignado");
      params.delete("fechaAsignacion");
      if (estado != null && estado !== "todos") params.set("estado", estado);
      if (vigencia != null) params.set("vigencia", String(vigencia));
      if (antig != null && antig !== "todos") params.set("antiguedad", antig);
      if (asigId != null && asigId > 0) params.set("asignado", String(asigId));
      if (fechaAsig != null && fechaAsig !== "")
        params.set("fechaAsignacion", fechaAsig);
      return params;
    },
    [
      searchParams,
      estadoActual,
      vigenciaActual,
      antiguedadActual,
      fechaAsignacionActual,
      asignadoIdActual,
    ]
  );

  const handleEstadoChange = useCallback(
    (value: string) => {
      const params = buildParams({
        estado: value === "todos" ? null : value,
      });
      router.push(`/procesos?${params.toString()}`);
    },
    [router, buildParams]
  );

  const handleVigenciaChange = useCallback(
    (value: string) => {
      const params = buildParams({
        vigencia: value === "todos" ? null : parseInt(value, 10),
      });
      router.push(`/procesos?${params.toString()}`);
    },
    [router, buildParams]
  );

  const handleAntiguedadChange = useCallback(
    (value: string) => {
      const params = buildParams({
        antiguedad: value === "todos" ? null : value,
      });
      router.push(`/procesos?${params.toString()}`);
    },
    [router, buildParams]
  );

  const handleAsignadoChange = useCallback(
    (value: string) => {
      const params = buildParams({
        asignadoId: value === "todos" ? null : parseInt(value, 10),
      });
      router.push(`/procesos?${params.toString()}`);
    },
    [router, buildParams]
  );

  const handleFechaAsignacionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value || null;
      const params = buildParams({ fechaAsignacion: value });
      router.push(`/procesos?${params.toString()}`);
    },
    [router, buildParams]
  );

  const handleLimpiar = useCallback(() => {
    router.push("/procesos");
  }, [router]);

  const tieneFiltros =
    estadoActual != null ||
    vigenciaActual != null ||
    (antiguedadActual != null && antiguedadActual !== "todos") ||
    asignadoIdActual != null ||
    fechaAsignacionActual != null;

  const fieldClass = "min-w-0 w-full h-10";

  return (
    <Card className="w-full min-w-0 border-border/80 py-5 px-5">
      <CardContent className="p-0 pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-5 items-end">
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="filtro-asignado"
          className="text-xs text-muted-foreground"
        >
          Persona asignada
        </Label>
        <Select
          value={asignadoIdActual != null ? String(asignadoIdActual) : "todos"}
          onValueChange={handleAsignadoChange}
        >
          <SelectTrigger id="filtro-asignado" className={fieldClass}>
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
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="filtro-fecha-asignacion"
          className="text-xs text-muted-foreground"
        >
          Fecha asignación
        </Label>
        <Input
          id="filtro-fecha-asignacion"
          type="date"
          value={fechaAsignacionActual ?? ""}
          onChange={handleFechaAsignacionChange}
          className={fieldClass}
          aria-label="Filtrar por fecha de asignación"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filtro-estado" className="text-xs text-muted-foreground">
          Estado
        </Label>
        <Select
          value={estadoActual ?? "todos"}
          onValueChange={handleEstadoChange}
        >
          <SelectTrigger id="filtro-estado" className={fieldClass}>
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
        <Label
          htmlFor="filtro-vigencia"
          className="text-xs text-muted-foreground"
        >
          Vigencia
        </Label>
        <Select
          value={vigenciaActual?.toString() ?? "todos"}
          onValueChange={handleVigenciaChange}
        >
          <SelectTrigger id="filtro-vigencia" className={fieldClass}>
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
        <Label
          htmlFor="filtro-antiguedad"
          className="text-xs text-muted-foreground"
        >
          Antigüedad
        </Label>
        <Select
          value={antiguedadActual ?? "todos"}
          onValueChange={handleAntiguedadChange}
        >
          <SelectTrigger id="filtro-antiguedad" className={fieldClass}>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            {OPCIONES_ANTIGUEDAD.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end gap-2 flex-wrap">
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
