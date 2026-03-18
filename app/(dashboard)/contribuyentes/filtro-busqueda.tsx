"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FiltroBusquedaContribuyentesProps = {
  valorActual: string;
  telefonoActual: string;
  correoActual: string;
  direccionActual: string;
};

export function FiltroBusquedaContribuyentes({
  valorActual,
  telefonoActual,
  correoActual,
  direccionActual,
}: FiltroBusquedaContribuyentesProps) {
  const router = useRouter();
  const [valor, setValor] = useState(valorActual);
  const [telefono, setTelefono] = useState(telefonoActual);
  const [correo, setCorreo] = useState(correoActual);
  const [direccion, setDireccion] = useState(direccionActual);

  useEffect(() => { setValor(valorActual); }, [valorActual]);
  useEffect(() => { setTelefono(telefonoActual); }, [telefonoActual]);
  useEffect(() => { setCorreo(correoActual); }, [correoActual]);
  useEffect(() => { setDireccion(direccionActual); }, [direccionActual]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (valor.trim())     params.set("q",         valor.trim());
      if (telefono.trim())  params.set("telefono",  telefono.trim());
      if (correo.trim())    params.set("correo",    correo.trim());
      if (direccion.trim()) params.set("direccion", direccion.trim());
      router.push(`/contribuyentes${params.toString() ? `?${params.toString()}` : ""}`);
    },
    [router, valor, telefono, correo, direccion]
  );

  const hayFiltros = !!(valorActual || telefonoActual || correoActual || direccionActual);

  const handleLimpiar = useCallback(() => {
    setValor(""); setTelefono(""); setCorreo(""); setDireccion("");
    router.push("/contribuyentes");
  }, [router]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contribuyentes-q" className="text-xs text-muted-foreground sr-only">
          Buscar por nombre o NIT
        </Label>
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="contribuyentes-q"
            type="search"
            placeholder="Nombre o NIT..."
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-[200px] pl-8"
            aria-label="Buscar por nombre o NIT"
          />
        </div>
      </div>
      <Input
        type="search"
        placeholder="Teléfono..."
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        className="w-36"
        aria-label="Filtrar por teléfono"
      />
      <Input
        type="search"
        placeholder="Correo..."
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        className="w-44"
        aria-label="Filtrar por correo"
      />
      <Input
        type="search"
        placeholder="Dirección..."
        value={direccion}
        onChange={(e) => setDireccion(e.target.value)}
        className="w-44"
        aria-label="Filtrar por dirección"
      />
      <Button type="submit" variant="secondary" size="sm" className="gap-1.5">
        <Search className="size-4" aria-hidden />
        Buscar
      </Button>
      {hayFiltros && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLimpiar}
          aria-label="Limpiar filtros"
        >
          <X className="size-4" aria-hidden />
        </Button>
      )}
    </form>
  );
}
