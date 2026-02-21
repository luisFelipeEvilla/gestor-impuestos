"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
  { value: "notificado", label: "Notificado" },
  { value: "en_contacto", label: "Cobro persuasivo" },
  { value: "en_cobro_coactivo", label: "En cobro coactivo" },
  { value: "cobrado", label: "Cobrado" },
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
  contribuyenteActual: string;
  comparendoActual: string;
  usuarios: UsuarioOption[];
  asignadoIdActual: number | null;
  fechaAsignacionActual: string | null;
};

export function FiltrosProcesos({
  estadoActual,
  vigenciaActual,
  antiguedadActual,
  contribuyenteActual,
  comparendoActual,
  usuarios: usuariosList,
  asignadoIdActual,
  fechaAsignacionActual,
}: FiltrosProcesosProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contribuyente, setContribuyente] = useState(contribuyenteActual);
  const [comparendo, setComparendo] = useState(comparendoActual);

  useEffect(() => {
    setContribuyente(contribuyenteActual);
  }, [contribuyenteActual]);
  useEffect(() => {
    setComparendo(comparendoActual);
  }, [comparendoActual]);

  const buildParams = useCallback(
    (updates: {
      estado?: string | null;
      vigencia?: string | number | null;
      antiguedad?: string | null;
      contribuyente?: string;
      comparendo?: string;
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
      const contrib =
        updates.contribuyente !== undefined
          ? updates.contribuyente
          : contribuyente;
      const comp =
        updates.comparendo !== undefined ? updates.comparendo : comparendo;
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
      params.delete("contribuyente");
      params.delete("comparendo");
      params.delete("asignado");
      params.delete("fechaAsignacion");
      if (estado != null && estado !== "todos") params.set("estado", estado);
      if (vigencia != null) params.set("vigencia", String(vigencia));
      if (antig != null && antig !== "todos") params.set("antiguedad", antig);
      if (contrib.trim()) params.set("contribuyente", contrib.trim());
      if (comp.trim()) params.set("comparendo", comp.trim());
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
      contribuyente,
      comparendo,
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

  const handleSubmitBusqueda = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const params = buildParams({
        contribuyente: contribuyente.trim(),
        comparendo: comparendo.trim(),
      });
      router.push(`/procesos?${params.toString()}`, { scroll: false });
    },
    [router, buildParams, contribuyente, comparendo]
  );

  const handleLimpiar = useCallback(() => {
    router.push("/procesos");
  }, [router]);

  const tieneFiltros =
    estadoActual != null ||
    vigenciaActual != null ||
    (antiguedadActual != null && antiguedadActual !== "todos") ||
    contribuyenteActual.length > 0 ||
    comparendoActual.length > 0 ||
    asignadoIdActual != null ||
    fechaAsignacionActual != null;

  const fieldClass = "min-w-0 w-full h-10";

  return (
    <Card className="border-border/80 py-4">
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-4 items-end">
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="filtro-comparendo"
          className="text-xs text-muted-foreground"
        >
          Nº comparendo
        </Label>
        <Input
          id="filtro-comparendo"
          type="search"
          placeholder="Número..."
          value={comparendo}
          onChange={(e) => setComparendo(e.target.value)}
          className={fieldClass}
          aria-label="Filtrar por número de comparendo"
        />
      </div>
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
