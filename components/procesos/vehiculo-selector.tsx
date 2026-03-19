"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Search, X, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { crearVehiculoRapido } from "@/lib/actions/vehiculos";

type VehiculoItem = { id: number; placa: string };

type Props = {
  /** ID del vehículo seleccionado actualmente */
  value: number | null;
  /** Label visible del vehículo seleccionado (para mostrar sin refetch) */
  initialLabel?: string | null;
  onChange: (id: number | null, label: string | null) => void;
};

const LIMIT = 10;

type Vista = "buscar" | "crear";

export function VehiculoSelector({ value, initialLabel, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [vista, setVista] = useState<Vista>("buscar");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<VehiculoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [displayLabel, setDisplayLabel] = useState<string | null>(initialLabel ?? null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Estado para la vista de creación
  const [placaNueva, setPlacaNueva] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);
  const placaRef = useRef<HTMLInputElement>(null);

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Reset page on query change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  // Fetch when modal is open (solo en vista buscar)
  useEffect(() => {
    if (!open || vista !== "buscar") return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (debouncedQuery) params.set("q", debouncedQuery);
    fetch(`/api/vehiculos?${params}`)
      .then((r) => r.json())
      .then((json) => {
        setItems(json.data ?? []);
        setTotal(json.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [open, vista, page, debouncedQuery]);

  // Focus según la vista activa
  useEffect(() => {
    if (!open) {
      setQuery("");
      setPage(1);
      setVista("buscar");
      setPlacaNueva("");
      setErrorCrear(null);
      return;
    }
    if (vista === "buscar") {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setTimeout(() => placaRef.current?.focus(), 50);
    }
  }, [open, vista]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const handleSelect = useCallback(
    (item: VehiculoItem) => {
      setDisplayLabel(item.placa);
      onChange(item.id, item.placa);
      setOpen(false);
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setDisplayLabel(null);
      onChange(null, null);
    },
    [onChange]
  );

  const abrirCrear = useCallback(() => {
    setPlacaNueva(query.toUpperCase().trim());
    setErrorCrear(null);
    setVista("crear");
  }, [query]);

  const handleCrear = useCallback(async () => {
    setCreando(true);
    setErrorCrear(null);
    try {
      const result = await crearVehiculoRapido(placaNueva);
      if (result.error) {
        setErrorCrear(result.error);
        return;
      }
      if (result.vehiculo) {
        handleSelect(result.vehiculo);
      }
    } catch {
      setErrorCrear("Error inesperado al crear el vehículo. Intenta de nuevo.");
    } finally {
      setCreando(false);
    }
  }, [placaNueva, handleSelect]);

  return (
    <>
      <input type="hidden" name="vehiculoId" value={value ?? ""} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "border-input bg-background focus-visible:ring-ring flex h-9 flex-1 items-center justify-between gap-2 rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 text-left",
            !displayLabel && "text-muted-foreground"
          )}
        >
          <span className="truncate">{displayLabel ?? "Buscar vehículo por placa (opcional)…"}</span>
          <Search className="size-4 shrink-0 opacity-50" />
        </button>
        {value != null && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleClear}
            aria-label="Limpiar vehículo"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          {vista === "buscar" ? (
            <>
              <DialogHeader>
                <DialogTitle>Seleccionar vehículo</DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-2 border-b pb-3">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  placeholder="Buscar por placa…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value.toUpperCase())}
                  className="border-0 shadow-none focus-visible:ring-0 px-0 h-8 font-mono uppercase"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <div className="min-h-[260px]">
                {loading ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">Cargando…</p>
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <p className="text-muted-foreground text-sm text-center">
                      {query ? `No se encontró ningún vehículo con placa "${query}".` : "Escribe una placa para buscar."}
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={abrirCrear}>
                      <Plus className="size-4" />
                      Registrar nuevo vehículo{query ? ` "${query}"` : ""}
                    </Button>
                  </div>
                ) : (
                  <>
                    <ul className="divide-y">
                      {items.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => handleSelect(item)}
                            className={cn(
                              "w-full text-left px-2 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground rounded transition-colors font-mono",
                              value === item.id && "bg-muted font-medium"
                            )}
                          >
                            {item.placa}
                          </button>
                        </li>
                      ))}
                    </ul>
                    {/* Botón de crear siempre visible cuando hay búsqueda activa */}
                    {query && (
                      <div className="border-t pt-3 mt-2">
                        <Button type="button" variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={abrirCrear}>
                          <Plus className="size-4" />
                          No está en la lista — registrar "{query}"
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-3 text-sm text-muted-foreground">
                  <span>
                    Página {page} de {totalPages} · {total} resultado{total !== 1 ? "s" : ""}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="size-4" />
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Registrar nuevo vehículo</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Ingresa la placa para registrar el vehículo. Podrás completar el resto de los datos desde el módulo de vehículos.
                </p>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    Placa <span className="text-destructive">*</span>
                  </label>
                  <Input
                    ref={placaRef}
                    value={placaNueva}
                    onChange={(e) => {
                      setPlacaNueva(e.target.value.toUpperCase().trim());
                      setErrorCrear(null);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCrear(); } }}
                    placeholder="Ej. ABC123"
                    className="font-mono uppercase"
                    maxLength={20}
                  />
                  {errorCrear && (
                    <p className="text-destructive text-xs">{errorCrear}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="button" onClick={handleCrear} disabled={!placaNueva || creando}>
                    {creando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    {creando ? "Registrando…" : "Registrar y seleccionar"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setVista("buscar")}>
                    <ArrowLeft className="size-4" />
                    Volver
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
