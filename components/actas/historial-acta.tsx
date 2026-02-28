import type { HistorialActaItem, MetadataEdicionActa } from "@/lib/actions/actas-types";
import { EvidenciaEdicionActa } from "./evidencia-edicion-acta";

const LABEL_TIPO_EVENTO: Record<string, string> = {
  creacion: "Creación",
  edicion: "Edición",
  envio_aprobacion: "Enviado a aprobación",
  aprobacion: "Aprobado",
  rechazo_participante: "Rechazo de participante",
  envio_correo: "Correo enviado",
};

function isMetadataEdicion(m: unknown): m is MetadataEdicionActa {
  return (
    m != null &&
    typeof m === "object" &&
    "despues" in m &&
    (m as MetadataEdicionActa).despues != null
  );
}

function isDevolucionBorrador(m: unknown): boolean {
  return (
    m != null &&
    typeof m === "object" &&
    "devolucionBorrador" in m &&
    (m as { devolucionBorrador?: boolean }).devolucionBorrador === true
  );
}

type HistorialActaProps = {
  items: HistorialActaItem[];
};

export function HistorialActa({ items }: HistorialActaProps) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No hay registros en el historial.
      </p>
    );
  }

  const getMotivoRechazo = (metadata: unknown): string | null => {
    if (metadata && typeof metadata === "object" && "motivo" in metadata) {
      const motivo = (metadata as { motivo?: string | null }).motivo;
      return typeof motivo === "string" && motivo.trim() !== "" ? motivo.trim() : null;
    }
    return null;
  };

  return (
    <ul className="space-y-2" role="list">
      {items.map((item) => {
        const motivoRechazo =
          item.tipoEvento === "rechazo_participante" ? getMotivoRechazo(item.metadata) : null;
        const esDevolucionBorrador =
          item.tipoEvento === "edicion" && isDevolucionBorrador(item.metadata);
        const hayEvidenciaEdicion =
          item.tipoEvento === "edicion" && isMetadataEdicion(item.metadata);
        const labelEvento = esDevolucionBorrador
          ? "Devolución a borrador"
          : (LABEL_TIPO_EVENTO[item.tipoEvento] ?? item.tipoEvento);
        return (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-muted-foreground shrink-0">
                {new Date(item.fecha).toLocaleString("es-CO", {
                  timeZone: "America/Bogota",
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
              <span className="font-medium">
                {labelEvento}
              </span>
              {item.usuarioNombre && (
                <span className="text-muted-foreground">
                  por {item.usuarioNombre}
                </span>
              )}
            </div>
            {motivoRechazo && (
              <p className="w-full text-muted-foreground text-xs mt-1 pl-0 border-l-0 border-border bg-muted/40 rounded px-2 py-1.5">
                Motivo: {motivoRechazo}
              </p>
            )}
            {hayEvidenciaEdicion && (
              <EvidenciaEdicionActa metadata={item.metadata as MetadataEdicionActa} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
