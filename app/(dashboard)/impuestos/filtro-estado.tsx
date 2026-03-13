"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "declarado", label: "Declarado" },
  { value: "liquidado", label: "Liquidado" },
  { value: "notificado", label: "Notificado" },
  { value: "en_cobro_coactivo", label: "Cobro coactivo" },
  { value: "pagado", label: "Pagado" },
  { value: "cerrado", label: "Cerrado" },
];

type Props = {
  estadoActual?: string;
  query?: string;
};

export function FiltroEstadoImpuestos({ estadoActual, query }: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();
    if (e.target.value) params.set("estado", e.target.value);
    if (query) params.set("q", query);
    router.push(`/impuestos${params.size > 0 ? `?${params.toString()}` : ""}`);
  }

  return (
    <select
      value={estadoActual ?? ""}
      onChange={handleChange}
      className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      aria-label="Filtrar por estado"
    >
      {ESTADOS.map((e) => (
        <option key={e.value} value={e.value}>
          {e.label}
        </option>
      ))}
    </select>
  );
}
