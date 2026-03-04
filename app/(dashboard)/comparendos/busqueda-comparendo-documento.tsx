"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface BusquedaComparendoDocumentoProps {
  noComparendoActual: string | null;
  documentoActual: string | null;
  nombreActual: string | null;
  /** URL para limpiar filtros de comparendo y documento (sin salir del listado). */
  urlLimpiar: string;
}

export function BusquedaComparendoDocumento({
  noComparendoActual,
  documentoActual,
  nombreActual,
  urlLimpiar,
}: BusquedaComparendoDocumentoProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [noComparendo, setNoComparendo] = useState(noComparendoActual ?? "");
  const [documento, setDocumento] = useState(documentoActual ?? "");
  const [nombre, setNombre] = useState(nombreActual ?? "");

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const params = new URLSearchParams(searchParams.toString());
      const comp = noComparendo.trim();
      const doc = documento.trim();
      const nom = nombre.trim();
      if (comp) params.set("noComparendo", comp);
      else params.delete("noComparendo");
      if (doc) params.set("documento", doc);
      else params.delete("documento");
      if (nom) params.set("nombre", nom);
      else params.delete("nombre");
      params.set("page", "1");
      router.push(`/comparendos?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, noComparendo, documento, nombre]
  );

  const tieneFiltro =
    (noComparendoActual?.trim() ?? "") !== "" ||
    (documentoActual?.trim() ?? "") !== "" ||
    (nombreActual?.trim() ?? "") !== "";

  return (
    <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3 shadow-sm">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-center gap-3"
        aria-label="Filtrar listado por número de comparendo o documento"
      >
        <div className="flex items-center gap-2">
          <Input
            id="buscar-no-comparendo"
            type="text"
            placeholder="Nº comparendo"
            value={noComparendo}
            onChange={(e) => setNoComparendo(e.target.value)}
            className="h-9 w-36 border-border/80 bg-background sm:w-44"
            aria-label="Filtrar por número de comparendo"
          />
          <Input
            id="buscar-documento"
            type="text"
            placeholder="Nº documento (NIT)"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            className="h-9 w-36 border-border/80 bg-background sm:w-44"
            aria-label="Filtrar por número de documento del contribuyente"
          />
          <Input
            id="buscar-nombre"
            type="text"
            placeholder="Nombre del contribuyente"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="h-9 w-44 border-border/80 bg-background sm:w-52"
            aria-label="Filtrar por nombre del contribuyente"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" className="h-9 gap-1.5 px-3">
            <Search className="size-4 shrink-0" aria-hidden />
            Filtrar
          </Button>
          {tieneFiltro && (
            <Button variant="ghost" size="sm" className="h-9 gap-1 px-2 text-muted-foreground hover:text-foreground" asChild>
              <Link href={urlLimpiar}>
                <X className="size-3.5 shrink-0" aria-hidden />
                Limpiar
              </Link>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
