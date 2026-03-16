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
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type VehiculoItem = { id: number; placa: string };

type Props = {
  /** ID del vehículo seleccionado actualmente */
  value: number | null;
  /** Label visible del vehículo seleccionado (para mostrar sin refetch) */
  initialLabel?: string | null;
  onChange: (id: number | null, label: string | null) => void;
};

const LIMIT = 10;

export function VehiculoSelector({ value, initialLabel, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<VehiculoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [displayLabel, setDisplayLabel] = useState<string | null>(initialLabel ?? null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Reset page on query change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  // Fetch when modal is open
  useEffect(() => {
    if (!open) return;
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
  }, [open, page, debouncedQuery]);

  // Focus search input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setQuery("");
      setPage(1);
    }
  }, [open]);

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
          <DialogHeader>
            <DialogTitle>Seleccionar vehículo</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 border-b pb-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Buscar por placa…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-8"
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
              <p className="text-muted-foreground text-sm py-8 text-center">
                {query ? "Sin resultados para esa placa." : "Escribe una placa para buscar."}
              </p>
            ) : (
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
        </DialogContent>
      </Dialog>
    </>
  );
}
