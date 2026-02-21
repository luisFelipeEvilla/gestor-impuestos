import {
  getSemáforoFechaLimite,
  getTextoEstadoFechaLimite,
  type SemáforoFechaLimite,
} from "@/lib/fechas-limite";
import { cn } from "@/lib/utils";

const SEMÁFORO_CONFIG: Record<
  SemáforoFechaLimite,
  { label: string; dotClass: string; bgClass: string; textClass: string }
> = {
  rojo: {
    label: "Prescrito / Prescripción muy cercana",
    dotClass: "bg-red-500",
    bgClass: "bg-red-500/10",
    textClass: "text-red-700 dark:text-red-400",
  },
  amarillo: {
    label: "Prescripción cercana",
    dotClass: "bg-amber-500",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-700 dark:text-amber-400",
  },
  verde: {
    label: "En plazo",
    dotClass: "bg-emerald-500",
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-700 dark:text-emerald-400",
  },
  sin_fecha: {
    label: "Sin fecha",
    dotClass: "bg-muted-foreground/40",
    bgClass: "bg-muted/50",
    textClass: "text-muted-foreground",
  },
};

type SemaforoFechaLimiteProps = {
  /** Fecha límite (ISO string, Date o null) */
  fechaLimite: string | Date | null | undefined;
  /** Si true, muestra solo el punto; si false, punto + texto estado */
  soloIndicador?: boolean;
  /** Si true, muestra como pill con fondo; si false, punto y texto inline */
  variant?: "inline" | "pill";
  className?: string;
};

function formatFechaLimiteParaTitle(fechaLimite: string | Date | null | undefined): string | null {
  if (fechaLimite == null) return null;
  const d = typeof fechaLimite === "string" ? new Date(fechaLimite + "T12:00:00") : fechaLimite;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function SemaforoFechaLimite({
  fechaLimite,
  soloIndicador = false,
  variant = "inline",
  className,
}: SemaforoFechaLimiteProps) {
  const semáforo = getSemáforoFechaLimite(fechaLimite);
  const texto = getTextoEstadoFechaLimite(fechaLimite);
  const config = SEMÁFORO_CONFIG[semáforo];
  const fechaFormateada = formatFechaLimiteParaTitle(fechaLimite);
  const titleCompleto =
    fechaFormateada != null ? `Fecha límite: ${fechaFormateada}` : texto;

  if (soloIndicador) {
    return (
      <span
        className={cn("inline-block size-2.5 shrink-0 rounded-full", config.dotClass, className)}
        title={fechaFormateada != null ? `Fecha límite: ${fechaFormateada}` : config.label}
        aria-label={config.label}
      />
    );
  }

  if (variant === "pill") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
          config.bgClass,
          config.textClass,
          className
        )}
        title={titleCompleto}
      >
        <span className={cn("size-2 shrink-0 rounded-full", config.dotClass)} aria-hidden />
        {texto}
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-sm", className)}
      title={titleCompleto}
    >
      <span
        className={cn("inline-block size-2.5 shrink-0 rounded-full", config.dotClass)}
        aria-hidden
      />
      <span className={config.textClass}>{texto}</span>
    </span>
  );
}
