"use client";

import { useRouter } from "next/navigation";

const CLASES = [
  "AUTOMOVIL",
  "CAMIONETA",
  "CAMPERO",
  "CAMION",
  "BUS",
  "BUSETA",
  "MICROBUS",
  "MOTOCICLETA",
  "MOTOCARGUERO",
  "CUATRIMOTO",
  "MAQUINARIA AGRICOLA",
  "OTRO",
];

type Props = {
  claseActual?: string;
  query?: string;
};

export function FiltroClaseVehiculos({ claseActual, query }: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();
    if (e.target.value) params.set("clase", e.target.value);
    if (query) params.set("q", query);
    router.push(`/vehiculos${params.size > 0 ? `?${params.toString()}` : ""}`);
  }

  return (
    <select
      value={claseActual ?? ""}
      onChange={handleChange}
      className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      aria-label="Filtrar por clase"
    >
      <option value="">Todas las clases</option>
      {CLASES.map((c) => (
        <option key={c} value={c}>
          {c.charAt(0) + c.slice(1).toLowerCase()}
        </option>
      ))}
    </select>
  );
}
