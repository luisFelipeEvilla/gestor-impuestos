"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
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

type ImpuestoOption = { id: number; nombre: string };

type FiltrosProcesosProps = {
  estadoActual: string | null;
  vigenciaActual: number | null;
  contribuyenteActual: string;
  asignadoActual: string;
  fechaAsignacionActual: string | null;
  impuestos: ImpuestoOption[];
  impuestoIdActual: number | null;
};

export function FiltrosProcesos({
  estadoActual,
  vigenciaActual,
  contribuyenteActual,
  asignadoActual,
  fechaAsignacionActual,
  impuestos: impuestosList,
  impuestoIdActual,
}: FiltrosProcesosProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contribuyente, setContribuyente] = useState(contribuyenteActual);
  const [asignado, setAsignado] = useState(asignadoActual);

  useEffect(() => {
    setContribuyente(contribuyenteActual);
  }, [contribuyenteActual]);

  useEffect(() => {
    setAsignado(asignadoActual);
  }, [asignadoActual]);

  const buildParams = useCallback(
    (updates: {
      estado?: string | null;
      vigencia?: string | number | null;
      contribuyente?: string;
      asignado?: string;
      fechaAsignacion?: string | null;
      impuestoId?: number | null;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      const estado =
        updates.estado !== undefined ? updates.estado : estadoActual;
      const vigencia =
        updates.vigencia !== undefined ? updates.vigencia : vigenciaActual;
      const contrib =
        updates.contribuyente !== undefined
          ? updates.contribuyente
          : contribuyente;
      const asig =
        updates.asignado !== undefined ? updates.asignado : asignado;
      const fechaAsig =
        updates.fechaAsignacion !== undefined
          ? updates.fechaAsignacion
          : fechaAsignacionActual;
      const impId =
        updates.impuestoId !== undefined
          ? updates.impuestoId
          : impuestoIdActual;

      params.delete("estado");
      params.delete("vigencia");
      params.delete("contribuyente");
      params.delete("asignado");
      params.delete("fechaAsignacion");
      params.delete("impuesto");
      if (estado != null && estado !== "todos") params.set("estado", estado);
      if (vigencia != null) params.set("vigencia", String(vigencia));
      if (contrib.trim()) params.set("contribuyente", contrib.trim());
      if (asig.trim()) params.set("asignado", asig.trim());
      if (fechaAsig != null && fechaAsig !== "")
        params.set("fechaAsignacion", fechaAsig);
      if (impId != null && impId > 0)
        params.set("impuesto", String(impId));
      return params;
    },
    [
      searchParams,
      estadoActual,
      vigenciaActual,
      contribuyente,
      asignado,
      fechaAsignacionActual,
      impuestoIdActual,
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

  const handleImpuestoChange = useCallback(
    (value: string) => {
      const params = buildParams({
        impuestoId: value === "todos" ? null : parseInt(value, 10),
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
        asignado: asignado.trim(),
      });
      router.push(`/procesos?${params.toString()}`);
    },
    [router, buildParams, contribuyente, asignado]
  );

  const handleLimpiar = useCallback(() => {
    router.push("/procesos");
  }, [router]);

  const tieneFiltros =
    estadoActual != null ||
    vigenciaActual != null ||
    contribuyenteActual.length > 0 ||
    asignadoActual.length > 0 ||
    fechaAsignacionActual != null ||
    impuestoIdActual != null;

  const fieldClass = "min-w-0 w-full h-10";

  return (
    <Card className="border-border/80 py-4">
      <CardContent className="p-4 pt-0">
        <form
          onSubmit={handleSubmitBusqueda}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-x-4 gap-y-4 items-end"
        >
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="filtro-contribuyente"
          className="text-xs text-muted-foreground"
        >
          Contribuyente
        </Label>
        <Input
          id="filtro-contribuyente"
          type="search"
          placeholder="NIT o nombre..."
          value={contribuyente}
          onChange={(e) => setContribuyente(e.target.value)}
          className={fieldClass}
          aria-label="Buscar por NIT o nombre del contribuyente"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="filtro-asignado"
          className="text-xs text-muted-foreground"
        >
          Persona asignada
        </Label>
        <Input
          id="filtro-asignado"
          type="search"
          placeholder="Nombre o email..."
          value={asignado}
          onChange={(e) => setAsignado(e.target.value)}
          className={fieldClass}
          aria-label="Buscar por nombre o email de la persona asignada"
        />
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
        <Label
          htmlFor="filtro-impuesto"
          className="text-xs text-muted-foreground"
        >
          Impuesto
        </Label>
        <Select
          value={impuestoIdActual != null ? String(impuestoIdActual) : "todos"}
          onValueChange={handleImpuestoChange}
        >
          <SelectTrigger id="filtro-impuesto" className={fieldClass}>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {impuestosList.map((i) => (
              <SelectItem key={i.id} value={String(i.id)}>
                {i.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      <div className="flex items-end gap-2 flex-wrap">
        <Button type="submit" variant="secondary" size="sm" className="gap-1.5 h-10">
          <Search className="size-4" aria-hidden />
          Buscar
        </Button>
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
        </form>
      </CardContent>
    </Card>
  );
}
