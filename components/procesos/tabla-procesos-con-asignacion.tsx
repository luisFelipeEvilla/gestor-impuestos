"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Columns3, Check } from "lucide-react";
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
  { id: "impuesto", label: "Impuesto" },
  { id: "contribuyente", label: "Contribuyente" },
  { id: "vigencia", label: "Vigencia" },
  { id: "noComparendo", label: "No. comparendo" },
  { id: "numeroResolucion", label: "Nº resolución" },
  { id: "monto", label: "Monto (COP)" },
  { id: "estado", label: "Estado" },
  { id: "antiguedad", label: "Antigüedad" },
  { id: "asignado", label: "Asignado" },
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
  impuestoNombre: string;
  contribuyenteNombre: string;
  contribuyenteNit: string;
  asignadoNombre: string | null;
};

interface TablaProcesosConAsignacionProps {
  lista: FilaProceso[];
  usuarios: { id: number; nombre: string }[];
  isAdmin: boolean;
}

export function TablaProcesosConAsignacion({
  lista,
  usuarios,
  isAdmin,
}: TablaProcesosConAsignacionProps) {
  const router = useRouter();
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
              <TableHead className="w-10 pr-0">
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
            {isColumnVisible("impuesto") && <TableHead>Impuesto</TableHead>}
            {isColumnVisible("contribuyente") && (
              <TableHead className="max-w-[200px] w-[200px]">Contribuyente</TableHead>
            )}
            {isColumnVisible("vigencia") && <TableHead>Vigencia</TableHead>}
            {isColumnVisible("noComparendo") && <TableHead>No. comparendo</TableHead>}
            {isColumnVisible("numeroResolucion") && <TableHead>Nº resolución</TableHead>}
            {isColumnVisible("monto") && <TableHead>Monto (COP)</TableHead>}
            {isColumnVisible("estado") && <TableHead>Estado</TableHead>}
            {isColumnVisible("antiguedad") && (
              <TableHead className="text-center">Antigüedad</TableHead>
            )}
            {isColumnVisible("asignado") && <TableHead>Asignado</TableHead>}
            {isColumnVisible("accion") && (
              <TableHead className="w-[80px]">Acción</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lista.map((p) => (
            <TableRow key={p.id}>
              {isColumnVisible("seleccion") && (
                <TableCell className="pr-0">
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
              {isColumnVisible("impuesto") && (
                <TableCell className="font-medium">{p.impuestoNombre}</TableCell>
              )}
              {isColumnVisible("contribuyente") && (
                <TableCell className="max-w-[200px] w-[200px]">
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
              {isColumnVisible("noComparendo") && (
                <TableCell className="text-sm text-muted-foreground">
                  {p.noComparendo ?? "—"}
                </TableCell>
              )}
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
              {isColumnVisible("antiguedad") && (
                <TableCell className="text-center">
                  <SemaforoFechaLimite
                    fechaLimite={p.fechaLimite}
                    variant="pill"
                    className="justify-center"
                  />
                </TableCell>
              )}
              {isColumnVisible("asignado") && (
                <TableCell className="text-muted-foreground">
                  {p.asignadoNombre ?? "—"}
                </TableCell>
              )}
              {isColumnVisible("accion") && (
                <TableCell>
                  <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                    <Link href={`/procesos/${p.id}`}>
                      Ver <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
