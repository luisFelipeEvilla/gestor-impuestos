"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Search, X, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FiltroBusquedaContribuyentesProps = {
  valorActual: string;
  conTelefono: boolean;
  conCorreo: boolean;
  conDireccion: boolean;
};

export function FiltroBusquedaContribuyentes({
  valorActual,
  conTelefono,
  conCorreo,
  conDireccion,
}: FiltroBusquedaContribuyentesProps) {
  const router = useRouter();
  const [valor, setValor] = useState(valorActual);

  useEffect(() => { setValor(valorActual); }, [valorActual]);

  function buildUrl(overrides: {
    q?: string;
    conTelefono?: boolean;
    conCorreo?: boolean;
    conDireccion?: boolean;
  }) {
    const params = new URLSearchParams();
    const q = (overrides.q !== undefined ? overrides.q : valorActual).trim();
    const tel = overrides.conTelefono !== undefined ? overrides.conTelefono : conTelefono;
    const correo = overrides.conCorreo !== undefined ? overrides.conCorreo : conCorreo;
    const dir = overrides.conDireccion !== undefined ? overrides.conDireccion : conDireccion;
    if (q) params.set("q", q);
    if (tel) params.set("con_telefono", "1");
    if (correo) params.set("con_correo", "1");
    if (dir) params.set("con_direccion", "1");
    return `/contribuyentes${params.toString() ? `?${params.toString()}` : ""}`;
  }

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      router.push(buildUrl({ q: valor }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, valor, conTelefono, conCorreo, conDireccion, valorActual]
  );

  const hayFiltros = !!(valorActual || conTelefono || conCorreo || conDireccion);

  const handleLimpiar = useCallback(() => {
    setValor("");
    router.push("/contribuyentes");
  }, [router]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
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
        <Button type="submit" variant="secondary" size="sm" className="gap-1.5">
          <Search className="size-4" aria-hidden />
          Buscar
        </Button>
      </form>

      <Button
        type="button"
        variant={conTelefono ? "default" : "outline"}
        size="sm"
        className="gap-1.5"
        onClick={() => router.push(buildUrl({ conTelefono: !conTelefono }))}
      >
        <Phone className="size-3.5" aria-hidden />
        Con teléfono
      </Button>

      <Button
        type="button"
        variant={conCorreo ? "default" : "outline"}
        size="sm"
        className="gap-1.5"
        onClick={() => router.push(buildUrl({ conCorreo: !conCorreo }))}
      >
        <Mail className="size-3.5" aria-hidden />
        Con correo
      </Button>

      <Button
        type="button"
        variant={conDireccion ? "default" : "outline"}
        size="sm"
        className="gap-1.5"
        onClick={() => router.push(buildUrl({ conDireccion: !conDireccion }))}
      >
        <MapPin className="size-3.5" aria-hidden />
        Con dirección
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
    </div>
  );
}
