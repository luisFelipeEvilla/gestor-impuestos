"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

type ClienteOption = { id: number; nombre: string; codigo: string | null };
type OpcionMiembro = { value: string; label: string; group: string };

type FiltrosCompromisosFormProps = {
  clientes: ClienteOption[];
  opcionesMiembro: OpcionMiembro[];
  clienteIdActual?: number;
  miembroActual?: string;
};

export function FiltrosCompromisosForm({
  clientes,
  opcionesMiembro,
  clienteIdActual,
  miembroActual,
}: FiltrosCompromisosFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClienteChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("cliente", value);
      else params.delete("cliente");
      router.push(`/actas/compromisos?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleMiembroChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("miembro", value);
      else params.delete("miembro");
      router.push(`/actas/compromisos?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleLimpiar = useCallback(() => {
    router.push("/actas/compromisos");
  }, [router]);

  const opcionesMiembroSelect = [
    { value: "", label: "Todos los asignados", group: "" },
    ...opcionesMiembro.map((o) => ({ ...o, group: o.group as "interno" | "cliente" })),
  ];

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Filtros</CardTitle>
        <CardDescription>Filtre por cliente o por persona asignada (interno o miembro del cliente).</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5 min-w-[200px]">
          <Label htmlFor="filtro-cliente" className="text-xs">
            Cliente
          </Label>
          <select
            id="filtro-cliente"
            value={clienteIdActual ?? ""}
            onChange={handleClienteChange}
            className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 py-1 text-sm outline-none focus-visible:ring-2"
            aria-label="Filtrar por cliente"
          >
            <option value="">Todos los clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo ? `${c.codigo} – ` : ""}{c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5 min-w-[240px]">
          <Label className="text-xs">Asignado a</Label>
          <SearchableSelect
            placeholder="Todos los asignados"
            value={miembroActual ?? ""}
            options={opcionesMiembroSelect}
            onChange={handleMiembroChange}
            width="full"
            aria-label="Filtrar por persona asignada"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleLimpiar}>
          Limpiar filtros
        </Button>
      </CardContent>
    </Card>
  );
}
