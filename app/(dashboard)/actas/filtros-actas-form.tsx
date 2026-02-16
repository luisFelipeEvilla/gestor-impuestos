"use client";

import * as React from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import type { SearchableMultiSelectOption } from "@/components/ui/searchable-multi-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { obtenerAsistentesExternosParaFiltro } from "@/lib/actions/actas";

interface ClienteOption {
  id: number;
  nombre: string;
  codigo: string | null;
}

interface UsuarioOption {
  id: number;
  nombre: string;
}

interface ExternoOption {
  email: string;
  nombre: string;
}

interface FiltrosActasFormProps {
  estadoParam: string;
  clientesList: ClienteOption[];
  usuariosList: UsuarioOption[];
  initialExternos: ExternoOption[];
  initialCliente: string;
  initialCreador: string;
  initialAsistenteInterno: string[];
  initialAsistenteExterno: string[];
  initialFechaDesde: string;
  initialFechaHasta: string;
  currentUrl: string;
}

export function FiltrosActasForm({
  estadoParam,
  clientesList,
  usuariosList,
  initialExternos,
  initialCliente,
  initialCreador,
  initialAsistenteInterno,
  initialAsistenteExterno,
  initialFechaDesde,
  initialFechaHasta,
  currentUrl,
}: FiltrosActasFormProps) {
  const [cliente, setCliente] = React.useState(initialCliente);
  const [externosOptions, setExternosOptions] = React.useState<ExternoOption[]>(initialExternos);
  const [loadingExternos, setLoadingExternos] = React.useState(false);
  const [selectedInternos, setSelectedInternos] = React.useState<string[]>(initialAsistenteInterno);
  const [selectedExternos, setSelectedExternos] = React.useState<string[]>(initialAsistenteExterno);

  React.useEffect(() => {
    setCliente(initialCliente);
    setExternosOptions(initialExternos);
    setSelectedInternos(initialAsistenteInterno);
    setSelectedExternos(initialAsistenteExterno);
  }, [
    initialCliente,
    initialExternos,
    initialAsistenteInterno,
    initialAsistenteExterno,
  ]);

  const handleClienteChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCliente(val);
    setSelectedExternos([]);
    const clienteId = val ? parseInt(val, 10) : undefined;
    if (clienteId && Number.isInteger(clienteId)) {
      setLoadingExternos(true);
      obtenerAsistentesExternosParaFiltro(clienteId)
        .then((list) => {
          setExternosOptions(list);
        })
        .finally(() => setLoadingExternos(false));
    } else {
      obtenerAsistentesExternosParaFiltro()
        .then((list) => setExternosOptions(list))
        .finally(() => setLoadingExternos(false));
    }
  }, [externosOptions]);

  const internosSelectOptions: SearchableMultiSelectOption[] = usuariosList.map((u) => ({
    value: String(u.id),
    label: u.nombre,
  }));

  const externosSelectOptions: SearchableMultiSelectOption[] = externosOptions.map((a) => ({
    value: a.email,
    label: `${a.nombre} (${a.email})`,
  }));

  return (
    <form method="get" action="/actas" className="flex flex-col gap-4">
      <input type="hidden" name="estado" value={estadoParam ?? ""} />
      <input type="hidden" name="asistenteInterno" value={selectedInternos.join(",")} />
      <input type="hidden" name="asistenteExterno" value={selectedExternos.join(",")} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente</Label>
          <select
            id="cliente"
            name="cliente"
            value={cliente}
            onChange={handleClienteChange}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todos</option>
            {clientesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {c.codigo ? ` (${c.codigo})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="creador">Creador</Label>
          <select
            id="creador"
            name="creador"
            defaultValue={initialCreador}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todos</option>
            {usuariosList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="asistenteInterno">Asistentes internos</Label>
          <SearchableMultiSelect
            id="asistenteInterno"
            aria-label="Asistentes internos"
            options={internosSelectOptions}
            value={selectedInternos}
            onChange={setSelectedInternos}
            placeholder="Buscar o seleccionar…"
            maxChips={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="asistenteExterno">
            Asistentes externos
            {cliente ? " (del cliente)" : ""}
          </Label>
          <SearchableMultiSelect
            id="asistenteExterno"
            aria-label="Asistentes externos"
            options={externosSelectOptions}
            value={selectedExternos}
            onChange={setSelectedExternos}
            placeholder={loadingExternos ? "Cargando…" : "Buscar o seleccionar…"}
            disabled={loadingExternos}
            maxChips={2}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="fechaDesde">Fecha desde</Label>
          <Input
            id="fechaDesde"
            name="fechaDesde"
            type="date"
            defaultValue={initialFechaDesde}
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fechaHasta">Fecha hasta</Label>
          <Input
            id="fechaHasta"
            name="fechaHasta"
            type="date"
            defaultValue={initialFechaHasta}
            className="h-9"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="secondary" size="sm">
          Filtrar
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={currentUrl} className="gap-1.5">
            <RefreshCw className="size-4" aria-hidden />
            Actualizar
          </Link>
        </Button>
      </div>
    </form>
  );
}
