import Link from "next/link";
import { X } from "lucide-react";

const ESTADOS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  asignado: "Asignado",
  facturacion: "Facturación",
  acuerdo_pago: "Acuerdo de pago",
  en_cobro_coactivo: "Cobro coactivo",
  finalizado: "Finalizado",
};

const ANTIGUEDAD_LABELS: Record<string, string> = {
  en_plazo: "En plazo",
  prescripcion_cercana: "Prescripción cercana",
  prescripcion_muy_cercana: "Prescripción muy cercana",
  prescrito: "Prescrito",
  sin_fecha: "Sin fecha límite",
};

type ChipItem = { label: string; href: string };

function buildUrl(params: URLSearchParams, remove: { key: string }): string {
  const next = new URLSearchParams(params);
  next.delete(remove.key);
  const q = next.toString();
  return q ? `/procesos?${q}` : "/procesos";
}

interface ChipsFiltrosProcesosProps {
  estado: string | null;
  vigencia: number | null;
  antiguedad: string | null;
  asignadoId: number | null;
  asignadoNombre: string | null;
  fechaAsignacion: string | null;
  noComparendo: string | null;
  documento: string | null;
  orderBy?: string;
  order?: string;
  perPage?: number;
  page?: number;
}

export function ChipsFiltrosProcesos({
  estado,
  vigencia,
  antiguedad,
  asignadoId,
  asignadoNombre,
  fechaAsignacion,
  noComparendo,
  documento,
  orderBy,
  order,
  perPage,
  page,
}: ChipsFiltrosProcesosProps) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (vigencia != null) params.set("vigencia", String(vigencia));
  if (antiguedad) params.set("antiguedad", antiguedad);
  if (asignadoId != null && asignadoId > 0) params.set("asignado", String(asignadoId));
  if (fechaAsignacion) params.set("fechaAsignacion", fechaAsignacion);
  if (noComparendo?.trim()) params.set("noComparendo", noComparendo.trim());
  if (documento?.trim()) params.set("documento", documento.trim());
  if (orderBy) params.set("orderBy", orderBy);
  if (order) params.set("order", order);
  if (perPage != null) params.set("perPage", String(perPage));
  if (page != null && page > 1) params.set("page", String(page));

  const chips: ChipItem[] = [];
  if (estado) {
    chips.push({
      label: `Estado: ${ESTADOS_LABELS[estado] ?? estado}`,
      href: buildUrl(params, { key: "estado" }),
    });
  }
  if (vigencia != null) {
    chips.push({
      label: `Vigencia: ${vigencia}`,
      href: buildUrl(params, { key: "vigencia" }),
    });
  }
  if (antiguedad) {
    chips.push({
      label: `Antigüedad: ${ANTIGUEDAD_LABELS[antiguedad] ?? antiguedad}`,
      href: buildUrl(params, { key: "antiguedad" }),
    });
  }
  if (asignadoId != null && asignadoId > 0) {
    chips.push({
      label: `Asignado: ${asignadoNombre ?? `#${asignadoId}`}`,
      href: buildUrl(params, { key: "asignado" }),
    });
  }
  if (fechaAsignacion) {
    chips.push({
      label: `Fecha asig.: ${fechaAsignacion}`,
      href: buildUrl(params, { key: "fechaAsignacion" }),
    });
  }
  if (noComparendo?.trim()) {
    chips.push({
      label: `Comparendo: ${noComparendo.trim()}`,
      href: buildUrl(params, { key: "noComparendo" }),
    });
  }
  if (documento?.trim()) {
    chips.push({
      label: `NIT/doc.: ${documento.trim()}`,
      href: buildUrl(params, { key: "documento" }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" role="list">
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          scroll={false}
          className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted hover:border-primary/30 transition-colors"
          role="listitem"
        >
          <span>{chip.label}</span>
          <X className="size-3 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      ))}
    </div>
  );
}
