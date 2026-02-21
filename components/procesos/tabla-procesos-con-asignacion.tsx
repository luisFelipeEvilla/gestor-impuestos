"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Columns3, Check, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { getSemáforoFechaLimite } from "@/lib/fechas-limite";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { SemaforoFechaLimite } from "@/components/procesos/semaforo-fecha-limite";
import { labelEstado } from "@/lib/estados-proceso";
import { asignarProcesosEnLote } from "@/lib/actions/procesos";
import { cn } from "@/lib/utils";

const COLUMNS_STORAGE_KEY = "procesos-tabla-columnas-visible";

const COLUMNS: { id: string; label: string }[] = [
  { id: "seleccion", label: "Selección" },
  { id: "asignado", label: "Asignado" },
  { id: "noComparendo", label: "No. comparendo" },
  { id: "antiguedad", label: "Antigüedad" },
  { id: "contribuyente", label: "Contribuyente" },
  { id: "vigencia", label: "Vigencia" },
  { id: "numeroResolucion", label: "Nº resolución" },
  { id: "monto", label: "Monto (COP)" },
  { id: "estado", label: "Estado" },
  { id: "accion", label: "Acción" },
];

const ALL_COLUMN_IDS = new Set(COLUMNS.map((c) => c.id));

function getStoredVisibleColumns(): Set<string> {
  if (typeof window === "undefined") return new Set(ALL_COLUMN_IDS);
  try {
    const raw = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (!raw) return new Set(ALL_COLUMN_IDS);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set(ALL_COLUMN_IDS);
    const set = new Set<string>(parsed.filter((id): id is string => typeof id === "string"));
    return new Set([...ALL_COLUMN_IDS].filter((id) => set.has(id)));
  } catch {
    return new Set(ALL_COLUMN_IDS);
  }
}

function persistVisibleColumns(visible: Set<string>) {
  try {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify([...visible]));
  } catch {
    // ignore
  }
}

export type FilaProceso = {
  id: number;
  contribuyenteId: number;
  vigencia: number;
  periodo: string | null;
  noComparendo: string | null;
  montoCop: string;
  estadoActual: string;
  numeroResolucion: string | null;
  fechaLimite: string | null;
  contribuyenteNombre: string;
  contribuyenteNit: string;
  asignadoNombre: string | null;
};

const SORTABLE_COLUMNS: Record<string, string> = {
  antiguedad: "fechaLimite",
  vigencia: "vigencia",
  monto: "montoCop",
  estado: "estadoActual",
};

interface TablaProcesosConAsignacionProps {
  lista: FilaProceso[];
  usuarios: { id: number; nombre: string }[];
  isAdmin: boolean;
  orderBy?: string;
  order?: "asc" | "desc";
}

export function TablaProcesosConAsignacion({
  lista,
  usuarios,
  isAdmin,
  orderBy = "fechaLimite",
  order = "asc",
}: TablaProcesosConAsignacionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [asignadoId, setAsignadoId] = useState<string>("");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(ALL_COLUMN_IDS);

  useEffect(() => {
    setVisibleColumns(getStoredVisibleColumns());
  }, []);

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        const displayedCount = [...next].filter(
          (c) => c !== "seleccion" || isAdmin
        ).length;
        if (displayedCount === 0) return prev;
      } else {
        next.add(id);
      }
      persistVisibleColumns(next);
      return next;
    });
  };

  const isColumnVisible = (id: string) => {
    if (id === "seleccion") return isAdmin && visibleColumns.has(id);
    return visibleColumns.has(id);
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === lista.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(lista.map((p) => p.id)));
    }
  };

  const handleAsignar = () => {
    const userId = asignadoId ? parseInt(asignadoId, 10) : 0;
    if (!userId || selectedIds.size === 0) {
      toast.error("Selecciona al menos un proceso y una persona.");
      return;
    }
    startTransition(async () => {
      const result = await asignarProcesosEnLote(Array.from(selectedIds), userId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        selectedIds.size === 1
          ? "Proceso asignado correctamente."
          : `${selectedIds.size} procesos asignados correctamente.`
      );
      setSelectedIds(new Set());
      setAsignadoId("");
      router.refresh();
    });
  };

  const showAssignBar = isAdmin && lista.length > 0;
  const hasSelection = selectedIds.size > 0;

  const buildSortUrl = useCallback(
    (nextOrderBy: string, nextOrder: "asc" | "desc") => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("orderBy", nextOrderBy);
      params.set("order", nextOrder);
      params.set("page", "1");
      return `/procesos?${params.toString()}`;
    },
    [searchParams]
  );

  const handleRowClick = useCallback(
    (e: React.MouseEvent<HTMLTableRowElement>, procesoId: number) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("a") ||
        target.closest("button") ||
        target.closest('input[type="checkbox"]')
      ) {
        return;
      }
      router.push(`/procesos/${procesoId}`);
    },
    [router]
  );

  function SortableHead({
    columnId,
    label,
    className,
  }: {
    columnId: string;
    label: string;
    className?: string;
  }) {
    const sortKey = SORTABLE_COLUMNS[columnId];
    if (!sortKey) {
      return <TableHead className={className}>{label}</TableHead>;
    }
    const isActive = orderBy === sortKey;
    const nextOrder = isActive && order === "asc" ? "desc" : "asc";
    const href = buildSortUrl(sortKey, isActive ? nextOrder : sortKey === "fechaLimite" ? "asc" : "desc");
    return (
      <TableHead className={className}>
        <Link
          href={href}
          scroll={false}
          className="inline-flex items-center gap-1 font-medium hover:text-primary transition-colors"
        >
          {label}
          {isActive ? (
            order === "asc" ? (
              <ArrowUp className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <ArrowDown className="size-3.5 shrink-0" aria-hidden />
            )
          ) : (
            <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          )}
        </Link>
      </TableHead>
    );
  }

  return (
    <div className="space-y-3">
      {showAssignBar && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/30 px-3 py-2",
            hasSelection && "border-primary/30 bg-primary/5"
          )}
        >
          <span className="text-sm font-medium text-muted-foreground">
            Asignar seleccionados a:
          </span>
          <Select
            value={asignadoId}
            onValueChange={setAsignadoId}
            disabled={isPending}
          >
            <SelectTrigger className="w-[220px]" size="sm">
              <SelectValue placeholder="Elegir persona" />
            </SelectTrigger>
            <SelectContent>
              {usuarios.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleAsignar}
            disabled={!hasSelection || !asignadoId || isPending}
          >
            {isPending ? "Asignando…" : "Asignar"}
          </Button>
          {hasSelection && (
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Columns3 className="size-4" aria-hidden />
              Columnas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mostrar columnas</DropdownMenuLabel>
            {COLUMNS.map((col) => {
              const visible = isColumnVisible(col.id);
              const disabled = col.id === "seleccion" && !isAdmin;
              return (
                <DropdownMenuItem
                  key={col.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    if (!disabled) toggleColumn(col.id);
                  }}
                  disabled={disabled}
                  className="gap-2"
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded border",
                      visible ? "bg-primary border-primary text-primary-foreground" : "border-border"
                    )}
                    aria-hidden
                  >
                    {visible ? <Check className="size-3" /> : null}
                  </span>
                  {col.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {isColumnVisible("seleccion") && (
              <TableHead className="w-10 pr-0" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  role="checkbox"
                  aria-label="Seleccionar todos"
                  checked={lista.length > 0 && selectedIds.size === lista.length}
                  onChange={toggleAll}
                  className="size-4 rounded border-border"
                />
              </TableHead>
            )}
            {isColumnVisible("asignado") && <TableHead>Asignado</TableHead>}
            {isColumnVisible("noComparendo") && <TableHead>No. comparendo</TableHead>}
            {isColumnVisible("antiguedad") && (
              <SortableHead columnId="antiguedad" label="Antigüedad" className="text-center" />
            )}
            {isColumnVisible("contribuyente") && (
              <TableHead className="max-w-[200px] w-[200px]">Contribuyente</TableHead>
            )}
            {isColumnVisible("vigencia") && (
              <SortableHead columnId="vigencia" label="Vigencia" />
            )}
            {isColumnVisible("numeroResolucion") && <TableHead>Nº resolución</TableHead>}
            {isColumnVisible("monto") && (
              <SortableHead columnId="monto" label="Monto (COP)" />
            )}
            {isColumnVisible("estado") && (
              <SortableHead columnId="estado" label="Estado" />
            )}
            {isColumnVisible("accion") && (
              <TableHead className="w-[80px]">Acción</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lista.map((p) => {
            const semaforo = getSemáforoFechaLimite(p.fechaLimite);
            const rowUrgente = semaforo === "rojo";
            return (
            <TableRow
              key={p.id}
              className={cn(
                rowUrgente && "border-l-4 border-l-red-500/70 bg-red-500/5 dark:bg-red-950/20",
                "cursor-pointer transition-colors hover:bg-muted/50"
              )}
              onClick={(e) => handleRowClick(e, p.id)}
            >
              {isColumnVisible("seleccion") && (
                <TableCell className="pr-0" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    role="checkbox"
                    aria-label={`Seleccionar proceso ${p.id}`}
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    className="size-4 rounded border-border"
                  />
                </TableCell>
              )}
              {isColumnVisible("asignado") && (
                <TableCell className="text-muted-foreground">
                  {p.asignadoNombre ?? "—"}
                </TableCell>
              )}
              {isColumnVisible("noComparendo") && (
                <TableCell className="text-sm text-muted-foreground">
                  {p.noComparendo ?? "—"}
                </TableCell>
              )}
              {isColumnVisible("antiguedad") && (
                <TableCell className="text-center">
                  <SemaforoFechaLimite
                    fechaLimite={p.fechaLimite}
                    variant="pill"
                    className="justify-center"
                  />
                </TableCell>
              )}
              {isColumnVisible("contribuyente") && (
                <TableCell className="max-w-[200px] w-[200px]" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={`/contribuyentes/${p.contribuyenteId}`}
                    className="block truncate text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
                    title={`${p.contribuyenteNombre} (${p.contribuyenteNit})`}
                  >
                    {p.contribuyenteNombre}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({p.contribuyenteNit})
                    </span>
                  </Link>
                </TableCell>
              )}
              {isColumnVisible("vigencia") && <TableCell>{p.vigencia}</TableCell>}
              {isColumnVisible("numeroResolucion") && (
                <TableCell className="text-sm text-muted-foreground">
                  {p.numeroResolucion ?? "—"}
                </TableCell>
              )}
              {isColumnVisible("monto") && (
                <TableCell>
                  {Number(p.montoCop).toLocaleString("es-CO")}
                </TableCell>
              )}
              {isColumnVisible("estado") && (
                <TableCell>{labelEstado(p.estadoActual)}</TableCell>
              )}
              {isColumnVisible("accion") && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                    <Link href={`/procesos/${p.id}`}>
                      Ver <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                </TableCell>
              )}
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
