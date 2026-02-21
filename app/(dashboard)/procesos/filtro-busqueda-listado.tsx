"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FiltroBusquedaListadoProcesosProps {
  contribuyenteActual: string;
  comparendoActual: string;
  /** Resto de parámetros de la URL a conservar (estado, vigencia, etc.) */
  baseParams: Record<string, string>;
}

export function FiltroBusquedaListadoProcesos({
  contribuyenteActual,
  comparendoActual,
  baseParams,
}: FiltroBusquedaListadoProcesosProps) {
  const router = useRouter();
  const [contribuyente, setContribuyente] = useState(contribuyenteActual);
  const [comparendo, setComparendo] = useState(comparendoActual);

  useEffect(() => {
    setContribuyente(contribuyenteActual);
  }, [contribuyenteActual]);
  useEffect(() => {
    setComparendo(comparendoActual);
  }, [comparendoActual]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const params = new URLSearchParams(baseParams);
      const c = contribuyente.trim();
      const comp = comparendo.trim();
      if (c) params.set("contribuyente", c);
      else params.delete("contribuyente");
      if (comp) params.set("comparendo", comp);
      else params.delete("comparendo");
      params.delete("page");
      params.set("page", "1");
      router.push(`/procesos?${params.toString()}`, { scroll: false });
    },
    [router, baseParams, contribuyente, comparendo]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 pb-4 border-b border-border/80"
    >
      <div className="flex flex-col gap-1.5 min-w-[180px]">
        <Label htmlFor="listado-filtro-contribuyente" className="text-xs text-muted-foreground">
          Contribuyente
        </Label>
        <Input
          id="listado-filtro-contribuyente"
          type="search"
          placeholder="NIT o nombre..."
          value={contribuyente}
          onChange={(e) => setContribuyente(e.target.value)}
          className="h-9"
          aria-label="Buscar por NIT o nombre del contribuyente"
        />
      </div>
      <div className="flex flex-col gap-1.5 min-w-[140px]">
        <Label htmlFor="listado-filtro-comparendo" className="text-xs text-muted-foreground">
          Nº comparendo
        </Label>
        <Input
          id="listado-filtro-comparendo"
          type="search"
          placeholder="Número..."
          value={comparendo}
          onChange={(e) => setComparendo(e.target.value)}
          className="h-9"
          aria-label="Filtrar por número de comparendo"
        />
      </div>
      <Button type="submit" variant="secondary" size="sm" className="gap-1.5 h-9">
        <Search className="size-4" aria-hidden />
        Buscar
      </Button>
    </form>
  );
}
