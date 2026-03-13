"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = { valorActual: string; claseActual?: string };

export function FiltroBusquedaVehiculos({ valorActual, claseActual }: Props) {
  const router = useRouter();
  const [valor, setValor] = useState(valorActual);

  useEffect(() => { setValor(valorActual); }, [valorActual]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const params = new URLSearchParams();
      const q = valor.trim();
      if (q) params.set("q", q);
      if (claseActual) params.set("clase", claseActual);
      router.push(`/vehiculos${params.size > 0 ? `?${params.toString()}` : ""}`);
    },
    [router, valor, claseActual]
  );

  const handleLimpiar = useCallback(() => {
    setValor("");
    const params = new URLSearchParams();
    if (claseActual) params.set("clase", claseActual);
    router.push(`/vehiculos${params.size > 0 ? `?${params.toString()}` : ""}`);
  }, [router, claseActual]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="vehiculos-q" className="sr-only">
          Buscar por placa, marca o contribuyente
        </Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
          <Input
            id="vehiculos-q"
            type="search"
            placeholder="Placa, marca, contribuyente..."
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-[220px] pl-8"
          />
        </div>
      </div>
      <Button type="submit" variant="secondary" size="sm" className="gap-1.5">
        <Search className="size-4" aria-hidden />
        Buscar
      </Button>
      {valorActual && (
        <Button type="button" variant="ghost" size="sm" onClick={handleLimpiar} aria-label="Limpiar búsqueda">
          <X className="size-4" aria-hidden />
        </Button>
      )}
    </form>
  );
}
