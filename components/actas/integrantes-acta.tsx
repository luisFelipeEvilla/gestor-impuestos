"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type IntegranteItem = {
  nombre: string;
  email: string;
  usuarioId?: number;
};

type UsuarioOption = { id: number; nombre: string; email: string };

type IntegrantesActaProps = {
  integrantes: IntegranteItem[];
  usuarios: UsuarioOption[];
  onChange: (integrantes: IntegranteItem[]) => void;
  disabled?: boolean;
};

export function IntegrantesActa({
  integrantes,
  usuarios,
  onChange,
  disabled = false,
}: IntegrantesActaProps) {
  const [manualNombre, setManualNombre] = useState("");
  const [manualEmail, setManualEmail] = useState("");

  const handleAgregarUsuario = useCallback(
    (usuarioId: number) => {
      const u = usuarios.find((x) => x.id === usuarioId);
      if (!u) return;
      if (integrantes.some((i) => i.email === u.email)) return;
      onChange([...integrantes, { nombre: u.nombre, email: u.email, usuarioId: u.id }]);
    },
    [integrantes, usuarios, onChange]
  );

  const handleAgregarManual = useCallback(() => {
    const nombre = manualNombre.trim();
    const email = manualEmail.trim();
    if (!nombre || !email) return;
    if (integrantes.some((i) => i.email === email)) return;
    onChange([...integrantes, { nombre, email }]);
    setManualNombre("");
    setManualEmail("");
  }, [integrantes, manualNombre, manualEmail, onChange]);

  const handleQuitar = useCallback(
    (index: number) => {
      onChange(integrantes.filter((_, i) => i !== index));
    },
    [integrantes, onChange]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Integrantes</Label>
      </div>

      {/* Seleccionar usuario del sistema */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid flex-1 min-w-[200px] gap-1.5">
          <Label htmlFor="usuarioId" className="text-xs">
            Usuario del sistema
          </Label>
          <select
            id="usuarioId"
            disabled={disabled}
            className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2"
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) handleAgregarUsuario(Number(v));
              e.target.value = "";
            }}
            aria-label="Agregar integrante desde usuarios"
          >
            <option value="">Selecciona un usuario</option>
            {usuarios
              .filter((u) => !integrantes.some((i) => i.email === u.email))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.email})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Agregar manual */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid min-w-[140px] gap-1.5">
          <Label htmlFor="manualNombre" className="text-xs">
            Nombre
          </Label>
          <Input
            id="manualNombre"
            value={manualNombre}
            onChange={(e) => setManualNombre(e.target.value)}
            placeholder="Nombre"
            disabled={disabled}
            aria-label="Nombre del integrante"
          />
        </div>
        <div className="grid min-w-[180px] gap-1.5">
          <Label htmlFor="manualEmail" className="text-xs">
            Correo
          </Label>
          <Input
            id="manualEmail"
            type="email"
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            disabled={disabled}
            aria-label="Correo del integrante"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleAgregarManual}
          disabled={disabled || !manualNombre.trim() || !manualEmail.trim()}
          aria-label="Agregar integrante manual"
        >
          Agregar
        </Button>
      </div>

      {/* Lista */}
      {integrantes.length > 0 ? (
        <ul className="space-y-2" role="list">
          {integrantes.map((inv, index) => (
            <li
              key={`${inv.email}-${index}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
            >
              <span>
                <strong>{inv.nombre}</strong>
                <span className="text-muted-foreground ml-1">{inv.email}</span>
              </span>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleQuitar(index)}
                  aria-label={`Quitar ${inv.nombre}`}
                >
                  Quitar
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No hay integrantes. Agrega usuarios o nombre/correo manual.</p>
      )}
    </div>
  );
}
