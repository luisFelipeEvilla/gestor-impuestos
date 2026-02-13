"use client";

import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { CompromisoFormItem } from "@/lib/actions/actas-types";

type IntegranteOption = { nombre: string; email: string };

type ClienteMiembroOption = { id: number; clienteId: number; nombre: string; email: string; cargo: string | null };

type CompromisosActaProps = {
  compromisos: CompromisoFormItem[];
  integrantes: IntegranteOption[];
  /** Miembros de los clientes asociados al acta (para asignar compromisos). */
  clientesMiembros: ClienteMiembroOption[];
  clientesIds: number[];
  onChange: (compromisos: CompromisoFormItem[]) => void;
  disabled?: boolean;
};

function formatDateForInput(value: string | null | undefined): string {
  if (!value || value.trim() === "") return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function CompromisosActa({
  compromisos,
  integrantes,
  clientesMiembros,
  clientesIds,
  onChange,
  disabled = false,
}: CompromisosActaProps) {
  const miembrosFiltrados = clientesMiembros.filter((m) => clientesIds.includes(m.clienteId));

  const opcionesAsignado = useMemo(() => {
    const opts: { value: string; label: string; group?: string }[] = [];
    if (integrantes.length > 0) {
      integrantes.forEach((inv, i) => {
        opts.push({
          value: `i-${i}`,
          label: `${inv.nombre} (${inv.email})`,
          group: "Nuestra empresa / asistentes",
        });
      });
    }
    if (miembrosFiltrados.length > 0) {
      miembrosFiltrados.forEach((m) => {
        opts.push({
          value: `m-${m.id}`,
          label: [m.nombre, m.email, m.cargo].filter(Boolean).join(" · "),
          group: "Miembros del cliente",
        });
      });
    }
    return opts;
  }, [integrantes, miembrosFiltrados]);

  const handleAgregar = useCallback(() => {
    onChange([
      ...compromisos,
      { descripcion: "", fechaLimite: "", asignadoIndex: null, asignadoClienteMiembroId: null },
    ]);
  }, [compromisos, onChange]);

  const handleQuitar = useCallback(
    (index: number) => {
      onChange(compromisos.filter((_, i) => i !== index));
    },
    [compromisos, onChange]
  );

  const handleChange = useCallback(
    (index: number, field: keyof CompromisoFormItem, value: string | number | null) => {
      const next = [...compromisos];
      if (next[index] == null) return;
      next[index] = { ...next[index], [field]: value };
      if (field === "asignadoIndex" && value != null) {
        next[index].asignadoClienteMiembroId = null;
      }
      if (field === "asignadoClienteMiembroId" && value != null) {
        next[index].asignadoIndex = null;
      }
      onChange(next);
    },
    [compromisos, onChange]
  );

  /** value en el select: "" | "i-0" (integrante index) | "m-5" (cliente miembro id) */
  const getAsignadoValue = (item: CompromisoFormItem): string => {
    if (item.asignadoClienteMiembroId != null && item.asignadoClienteMiembroId > 0) {
      return `m-${item.asignadoClienteMiembroId}`;
    }
    if (item.asignadoIndex != null && item.asignadoIndex >= 0) {
      return `i-${item.asignadoIndex}`;
    }
    return "";
  };

  const handleAsignadoChange = useCallback(
    (index: number, value: string) => {
      const next = [...compromisos];
      if (next[index] == null) return;
      if (value === "") {
        next[index] = {
          ...next[index],
          asignadoIndex: null,
          asignadoClienteMiembroId: null,
        };
        onChange(next);
        return;
      }
      if (value.startsWith("i-")) {
        const idx = parseInt(value.slice(2), 10);
        next[index] = {
          ...next[index],
          asignadoIndex: Number.isNaN(idx) ? null : idx,
          asignadoClienteMiembroId: null,
        };
        onChange(next);
        return;
      }
      if (value.startsWith("m-")) {
        const id = parseInt(value.slice(2), 10);
        next[index] = {
          ...next[index],
          asignadoIndex: null,
          asignadoClienteMiembroId: Number.isNaN(id) ? null : id,
        };
        onChange(next);
      }
    },
    [compromisos, onChange]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Compromisos</Label>
        {!disabled && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleAgregar}
            aria-label="Agregar compromiso"
          >
            Agregar compromiso
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-sm">
        Cada compromiso es individual: descripción, fecha límite y persona asignada (integrante de la reunión).
      </p>

      {compromisos.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No hay compromisos. Haz clic en &quot;Agregar compromiso&quot; para crear uno.
        </p>
      ) : (
        <ul className="space-y-4" role="list">
          {compromisos.map((item, index) => (
            <li
              key={index}
              className="rounded-lg border border-border bg-muted/20 p-4 space-y-3"
            >
              <div className="grid gap-2">
                <Label htmlFor={`compromiso-desc-${index}`} className="text-xs">
                  Descripción
                </Label>
                <textarea
                  id={`compromiso-desc-${index}`}
                  value={item.descripcion}
                  onChange={(e) =>
                    handleChange(index, "descripcion", e.target.value)
                  }
                  placeholder="Descripción del compromiso"
                  disabled={disabled}
                  rows={2}
                  className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 resize-y min-h-[60px]"
                  aria-label={`Descripción del compromiso ${index + 1}`}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor={`compromiso-fecha-${index}`} className="text-xs">
                    Fecha límite
                  </Label>
                  <Input
                    id={`compromiso-fecha-${index}`}
                    type="date"
                    value={formatDateForInput(item.fechaLimite ?? "")}
                    onChange={(e) =>
                      handleChange(
                        index,
                        "fechaLimite",
                        e.target.value.trim() || ""
                      )
                    }
                    disabled={disabled}
                    aria-label={`Fecha límite del compromiso ${index + 1}`}
                    className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label
                    htmlFor={`compromiso-asignado-${index}`}
                    className="text-xs"
                  >
                    Persona asignada
                  </Label>
                  <SearchableSelect
                    id={`compromiso-asignado-${index}`}
                    aria-label={`Persona asignada al compromiso ${index + 1}`}
                    placeholder="Ninguno"
                    value={getAsignadoValue(item)}
                    options={[{ value: "", label: "Ninguno" }, ...opcionesAsignado]}
                    onChange={(v) => handleAsignadoChange(index, v)}
                    disabled={disabled}
                    width="full"
                  />
                </div>
              </div>
              {!disabled && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleQuitar(index)}
                    aria-label={`Quitar compromiso ${index + 1}`}
                  >
                    Quitar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
