import Link from "next/link";
import { X } from "lucide-react";

const ESTADOS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  declarado: "Declarado",
  liquidado: "Liquidado",
  notificado: "Notificado",
  en_cobro_coactivo: "Cobro coactivo",
  pagado: "Pagado",
  cerrado: "Cerrado",
};

type ChipItem = { label: string; href: string };

function removeParam(params: URLSearchParams, key: string): string {
  const next = new URLSearchParams(params);
  next.delete(key);
  next.delete("page");
  const q = next.toString();
  return q ? `/impuestos?${q}` : "/impuestos";
}

interface ChipsFiltrosImpuestosProps {
  estado: string | null;
  vigencia: number | null;
  busqueda: string | null;
  perPage?: number;
}

export function ChipsFiltrosImpuestos({
  estado,
  vigencia,
  busqueda,
  perPage,
}: ChipsFiltrosImpuestosProps) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (vigencia != null) params.set("vigencia", String(vigencia));
  if (busqueda?.trim()) params.set("q", busqueda.trim());
  if (perPage != null) params.set("perPage", String(perPage));

  const chips: ChipItem[] = [];
  if (estado) {
    chips.push({
      label: `Estado: ${ESTADOS_LABELS[estado] ?? estado}`,
      href: removeParam(params, "estado"),
    });
  }
  if (vigencia != null) {
    chips.push({
      label: `Vigencia: ${vigencia}`,
      href: removeParam(params, "vigencia"),
    });
  }
  if (busqueda?.trim()) {
    chips.push({
      label: `Búsqueda: ${busqueda.trim()}`,
      href: removeParam(params, "q"),
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
