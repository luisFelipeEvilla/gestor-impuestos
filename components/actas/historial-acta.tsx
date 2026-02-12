import type { HistorialActaItem } from "@/lib/actions/actas";

const LABEL_TIPO_EVENTO: Record<string, string> = {
  creacion: "Creación",
  edicion: "Edición",
  envio_aprobacion: "Enviado a aprobación",
  aprobacion: "Aprobado",
  envio_correo: "Correo enviado",
};

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

  return (
    <ul className="space-y-2" role="list">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
        >
          <span className="text-muted-foreground shrink-0">
            {new Date(item.fecha).toLocaleString("es-CO", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </span>
          <span className="font-medium">
            {LABEL_TIPO_EVENTO[item.tipoEvento] ?? item.tipoEvento}
          </span>
          {item.usuarioNombre && (
            <span className="text-muted-foreground">
              por {item.usuarioNombre}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
