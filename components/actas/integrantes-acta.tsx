"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

export type IntegranteItem = {
  nombre: string;
  email: string;
  usuarioId?: number;
  tipo: "interno" | "externo";
  /** Cargo del asistente (internos: Gerente general, Abogado, etc.; externos: texto libre). */
  cargo?: string;
  /** Si true, al enviar el acta por correo se le solicita aprobación a este asistente. */
  solicitarAprobacionCorreo?: boolean;
};

type UsuarioOption = { id: number; nombre: string; email: string };
type ClienteMiembroOption = { id: number; clienteId: number; nombre: string; email: string; cargo: string | null };
type CargoOption = { id: number; nombre: string };

type IntegrantesActaProps = {
  integrantes: IntegranteItem[];
  usuarios: UsuarioOption[];
  /** Cargos de la empresa para asignar a internos (ej. Gerente general, Abogado). */
  cargosEmpresa?: CargoOption[];
  /** Miembros de los clientes que participan en el acta (para agregar como externos). */
  clientesMiembros?: ClienteMiembroOption[];
  /** IDs de clientes asociados al acta; se filtran los miembros por estos. */
  clientesIds?: number[];
  onChange: (integrantes: IntegranteItem[]) => void;
  disabled?: boolean;
};

export function IntegrantesActa({
  integrantes,
  usuarios,
  cargosEmpresa = [],
  clientesMiembros = [],
  clientesIds = [],
  onChange,
  disabled = false,
}: IntegrantesActaProps) {
  const [manualNombre, setManualNombre] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualCargo, setManualCargo] = useState("");
  const [cargoParaNuevoInterno, setCargoParaNuevoInterno] = useState(
    () => cargosEmpresa[0]?.nombre ?? ""
  );

  const handleAgregarUsuario = useCallback(
    (usuarioId: number) => {
      const u = usuarios.find((x) => x.id === usuarioId);
      if (!u) return;
      if (integrantes.some((i) => i.email === u.email)) return;
      onChange([
        ...integrantes,
        {
          nombre: u.nombre,
          email: u.email,
          usuarioId: u.id,
          tipo: "interno" as const,
          cargo: cargoParaNuevoInterno.trim() || undefined,
          solicitarAprobacionCorreo: true,
        },
      ]);
    },
    [integrantes, usuarios, onChange, cargoParaNuevoInterno]
  );

  const handleCargoInternoChange = useCallback(
    (integranteIndex: number, cargo: string) => {
      if (integranteIndex < 0 || integranteIndex >= integrantes.length) return;
      const next = [...integrantes];
      next[integranteIndex] = {
        ...next[integranteIndex],
        cargo: cargo.trim() || undefined,
      };
      onChange(next);
    },
    [integrantes, onChange]
  );

  const handleAgregarManual = useCallback(() => {
    const nombre = manualNombre.trim();
    const email = manualEmail.trim();
    if (!nombre || !email) return;
    if (integrantes.some((i) => i.email === email)) return;
    onChange([
      ...integrantes,
      {
        nombre,
        email,
        tipo: "externo" as const,
        cargo: manualCargo.trim() || undefined,
        solicitarAprobacionCorreo: true,
      },
    ]);
    setManualNombre("");
    setManualEmail("");
    setManualCargo("");
  }, [integrantes, manualNombre, manualEmail, manualCargo, onChange]);

  const miembrosFiltrados = clientesMiembros.filter((m) => clientesIds.includes(m.clienteId));
  const handleAgregarDesdeCliente = useCallback(
    (memberId: string) => {
      const id = parseInt(memberId, 10);
      const m = miembrosFiltrados.find((x) => x.id === id);
      if (!m) return;
      if (integrantes.some((i) => i.email === m.email)) return;
      onChange([
        ...integrantes,
        {
          nombre: m.nombre,
          email: m.email,
          tipo: "externo" as const,
          cargo: m.cargo ?? undefined,
          solicitarAprobacionCorreo: true,
        },
      ]);
    },
    [integrantes, miembrosFiltrados, onChange]
  );

  const handleQuitar = useCallback(
    (index: number) => {
      onChange(integrantes.filter((_, i) => i !== index));
    },
    [integrantes, onChange]
  );

  const handleSolicitarAprobacionChange = useCallback(
    (index: number, value: boolean) => {
      const next = [...integrantes];
      if (next[index]) {
        next[index] = { ...next[index], solicitarAprobacionCorreo: value };
        onChange(next);
      }
    },
    [integrantes, onChange]
  );

  const internos = integrantes.filter((i) => (i.tipo ?? "externo") === "interno");
  const externos = integrantes.filter((i) => (i.tipo ?? "externo") === "externo");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label>Asistentes de la reunión</Label>
      </div>

      {/* ——— Sección 1: Miembros de nuestra empresa ——— */}
      <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Miembros de nuestra empresa</h3>
        <p className="text-muted-foreground text-xs">
          Agrega empleados o usuarios del sistema que asisten a la reunión. Asigna un cargo (ej. Gerente general, Abogado).
        </p>
        <div className="flex flex-wrap items-end gap-2">
          {cargosEmpresa.length > 0 && (
            <div className="grid min-w-[160px] gap-1.5">
              <Label htmlFor="cargoNuevoInterno" className="text-xs">
                Cargo (para el siguiente)
              </Label>
              <select
                id="cargoNuevoInterno"
                value={cargoParaNuevoInterno}
                onChange={(e) => setCargoParaNuevoInterno(e.target.value)}
                disabled={disabled}
                className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                aria-label="Cargo del próximo integrante interno"
              >
                <option value="">Sin cargo</option>
                {cargosEmpresa.map((c) => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid flex-1 min-w-[200px] gap-1.5">
            <Label htmlFor="usuarioId" className="text-xs">
              Agregar interno
            </Label>
            <SearchableSelect
              id="usuarioId"
              aria-label="Agregar integrante desde usuarios"
              placeholder="Buscar usuario…"
              value=""
              options={usuarios
                .filter((u) => !integrantes.some((i) => i.email === u.email))
                .map((u) => ({ value: String(u.id), label: `${u.nombre} (${u.email})` }))}
              onChange={(v) => v && handleAgregarUsuario(Number(v))}
              disabled={disabled}
              width="full"
            />
          </div>
        </div>
        {internos.length > 0 && (
          <ul className="space-y-2" role="list">
            {internos.map((inv) => {
              const index = integrantes.indexOf(inv);
              return (
                <li
                  key={`${inv.email}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <strong>{inv.nombre}</strong>
                    <span className="text-muted-foreground">{inv.email}</span>
                    {cargosEmpresa.length > 0 && !disabled ? (
                      <select
                        value={inv.cargo ?? ""}
                        onChange={(e) => handleCargoInternoChange(index, e.target.value)}
                        className="border-input bg-muted/50 text-muted-foreground ml-1 h-7 rounded border px-2 text-xs"
                        aria-label={`Cargo de ${inv.nombre}`}
                      >
                        <option value="">Sin cargo</option>
                        {cargosEmpresa.map((c) => (
                          <option key={c.id} value={c.nombre}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    ) : inv.cargo ? (
                      <span className="text-muted-foreground text-xs">· {inv.cargo}</span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-3">
                    {!disabled && (
                      <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={inv.solicitarAprobacionCorreo !== false}
                          onChange={(e) =>
                            handleSolicitarAprobacionChange(index, e.target.checked)
                          }
                          className="h-3.5 w-3.5 rounded border-input"
                          aria-label={`Solicitar aprobación por correo a ${inv.nombre}`}
                        />
                        Solicitar aprobación por correo
                      </label>
                    )}
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
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ——— Sección 2: Miembros externos ——— */}
      <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Miembros externos</h3>
        <p className="text-muted-foreground text-xs">
          Agrega asistentes de las organizaciones que participan en el acta o ingresa nombre y correo manualmente.
        </p>
        {miembrosFiltrados.length > 0 && (
          <div className="grid gap-1.5">
            <Label className="text-xs">Agregar desde organización del cliente</Label>
            <SearchableSelect
              aria-label="Agregar miembro del cliente como asistente"
              placeholder="Buscar miembro de la organización…"
              value=""
              options={miembrosFiltrados
                .filter((m) => !integrantes.some((i) => i.email === m.email))
                .map((m) => ({
                  value: String(m.id),
                  label: [m.nombre, m.email, m.cargo].filter(Boolean).join(" · "),
                }))}
              onChange={(v) => v && handleAgregarDesdeCliente(v)}
              disabled={disabled}
              width="full"
            />
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid min-w-[140px] gap-1.5">
            <Label htmlFor="manualNombre" className="text-xs">
              O agregar manualmente — Nombre
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
          <div className="grid min-w-[160px] gap-1.5">
            <Label htmlFor="manualCargo" className="text-xs">
              Cargo
            </Label>
            <Input
              id="manualCargo"
              value={manualCargo}
              onChange={(e) => setManualCargo(e.target.value)}
              placeholder="Ej. Gerente"
              disabled={disabled}
              aria-label="Cargo del asistente externo"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleAgregarManual}
            disabled={disabled || !manualNombre.trim() || !manualEmail.trim()}
            aria-label="Agregar integrante externo"
          >
            Agregar externo
          </Button>
        </div>
        {externos.length > 0 && (
          <ul className="space-y-2" role="list">
            {externos.map((inv) => {
              const index = integrantes.indexOf(inv);
              return (
                <li
                  key={`${inv.email}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <span className="flex flex-wrap items-center gap-x-1 gap-y-1">
                    <strong>{inv.nombre}</strong>
                    <span className="text-muted-foreground">{inv.email}</span>
                    {inv.cargo && (
                      <span className="text-muted-foreground text-xs">· {inv.cargo}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    {!disabled && (
                      <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={inv.solicitarAprobacionCorreo !== false}
                          onChange={(e) =>
                            handleSolicitarAprobacionChange(index, e.target.checked)
                          }
                          className="h-3.5 w-3.5 rounded border-input"
                          aria-label={`Solicitar aprobación por correo a ${inv.nombre}`}
                        />
                        Solicitar aprobación por correo
                      </label>
                    )}
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
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
