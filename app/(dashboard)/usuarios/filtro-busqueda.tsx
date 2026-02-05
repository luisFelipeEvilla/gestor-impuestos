"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FiltroBusquedaUsuariosProps = {
  valorActual: string;
  verInactivos: boolean;
};

export function FiltroBusquedaUsuarios({
  valorActual,
  verInactivos,
}: FiltroBusquedaUsuariosProps): JSX.Element {
  const router = useRouter();
  const [valor, setValor] = useState(valorActual);

  useEffect(() => {
    setValor(valorActual);
  }, [valorActual]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (verInactivos) params.set("inactivos", "1");
      const q = valor.trim();
      if (q) params.set("q", q);
      router.push(`/usuarios${params.toString() ? `?${params.toString()}` : ""}`);
    },
    [router, valor, verInactivos]
  );

  const handleLimpiar = useCallback(() => {
    setValor("");
    const params = new URLSearchParams();
    if (verInactivos) params.set("inactivos", "1");
    router.push(`/usuarios${params.toString() ? `?${params.toString()}` : ""}`);
  }, [router, verInactivos]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="usuarios-q" className="text-xs text-muted-foreground sr-only">
          Buscar por nombre o email
        </Label>
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="usuarios-q"
            type="search"
            placeholder="Nombre o email..."
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-[200px] pl-8"
            aria-label="Buscar por nombre o email"
          />
        </div>
      </div>
      <Button type="submit" variant="secondary" size="sm" className="gap-1.5">
        <Search className="size-4" aria-hidden />
        Buscar
      </Button>
      {valorActual && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLimpiar}
          aria-label="Limpiar búsqueda"
        >
          <X className="size-4" aria-hidden />
        </Button>
      )}
    </form>
  );
}
