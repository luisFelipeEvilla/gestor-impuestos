"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { OPCIONES_POR_PAGINA } from "@/lib/pagination";

interface SelectorPorPaginaProps {
  /** Parámetros actuales de búsqueda (sin perPage ni page; se añaden al cambiar) */
  searchParams: Record<string, string>;
  perPage: number;
  /** Opciones a mostrar (por defecto OPCIONES_POR_PAGINA) */
  opciones?: readonly number[];
}

export function SelectorPorPagina({
  searchParams,
  perPage,
  opciones = OPCIONES_POR_PAGINA,
}: SelectorPorPaginaProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("perPage", value);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const value = opciones.includes(perPage as (typeof opciones)[number])
    ? String(perPage)
    : String(opciones[0]);

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="selector-por-pagina" className="text-sm text-muted-foreground whitespace-nowrap">
        Por página
      </Label>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger id="selector-por-pagina" className="h-8 w-[72px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
