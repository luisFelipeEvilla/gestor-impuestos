"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
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
import { SemaforoFechaLimite } from "@/components/procesos/semaforo-fecha-limite";
import { labelEstado } from "@/lib/estados-proceso";
import { asignarProcesosEnLote } from "@/lib/actions/procesos";
import { cn } from "@/lib/utils";

export type FilaProceso = {
  id: number;
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
      <Table>
        <TableHeader>
          <TableRow>
            {isAdmin && (
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
            <TableHead>Impuesto</TableHead>
            <TableHead className="max-w-[200px] w-[200px]">Contribuyente</TableHead>
            <TableHead>Vigencia</TableHead>
            <TableHead>No. comparendo</TableHead>
            <TableHead>Nº resolución</TableHead>
            <TableHead>Monto (COP)</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-center">Antigüedad</TableHead>
            <TableHead>Asignado</TableHead>
            <TableHead className="w-[80px]">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lista.map((p) => (
            <TableRow key={p.id}>
              {isAdmin && (
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
              <TableCell className="font-medium">{p.impuestoNombre}</TableCell>
              <TableCell className="max-w-[200px] w-[200px]">
                <span
                  className="block truncate"
                  title={`${p.contribuyenteNombre} (${p.contribuyenteNit})`}
                >
                  {p.contribuyenteNombre}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({p.contribuyenteNit})
                  </span>
                </span>
              </TableCell>
              <TableCell>{p.vigencia}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {p.noComparendo ?? "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {p.numeroResolucion ?? "—"}
              </TableCell>
              <TableCell>
                {Number(p.montoCop).toLocaleString("es-CO")}
              </TableCell>
              <TableCell>{labelEstado(p.estadoActual)}</TableCell>
              <TableCell className="text-center">
                <SemaforoFechaLimite
                  fechaLimite={p.fechaLimite}
                  variant="pill"
                  className="justify-center"
                />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {p.asignadoNombre ?? "—"}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                  <Link href={`/procesos/${p.id}`}>
                    Ver <ChevronRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
