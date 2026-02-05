"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const AÑO_MIN = 2000;
const AÑO_MAX = new Date().getFullYear() + 2;
const OPCIONES_VIGENCIA = Array.from(
  { length: AÑO_MAX - AÑO_MIN + 1 },
  (_, i) => AÑO_MIN + i
).reverse();

type DashboardFiltrosProps = {
  vigenciaActual: number | null;
};

export function DashboardFiltros({ vigenciaActual }: DashboardFiltrosProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleVigenciaChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "todos") {
        params.delete("vigencia");
      } else {
        params.set("vigencia", value);
      }
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleRefresh = useCallback((): void => {
    router.refresh();
  }, [router]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dashboard-vigencia" className="text-xs text-muted-foreground">
          Vigencia
        </Label>
        <Select
          value={vigenciaActual?.toString() ?? "todos"}
          onValueChange={handleVigenciaChange}
        >
          <SelectTrigger id="dashboard-vigencia" className="w-[120px]">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {OPCIONES_VIGENCIA.map((año) => (
              <SelectItem key={año} value={año.toString()}>
                {año}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        aria-label="Refrescar información del dashboard"
        className="gap-2"
      >
        <RefreshCw className="size-4" aria-hidden />
        Refrescar
      </Button>
    </div>
  );
}
