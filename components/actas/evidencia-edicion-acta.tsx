"use client";

import type { MetadataEdicionActa } from "@/lib/actions/actas-types";

type Props = { metadata: MetadataEdicionActa };

function sameArray(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

type IntegranteItem = { nombre: string; email: string; tipo?: string; cargo?: string | null; solicitarAprobacionCorreo?: boolean };
type CompromisoItem = { descripcion: string; fechaLimite: string | null };

function sameIntegrantes(a: IntegranteItem[] | undefined, b: IntegranteItem[] | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((ai, i) => {
    const bi = b[i];
    return (
      ai.nombre === bi.nombre &&
      ai.email === bi.email &&
      (ai.tipo ?? "externo") === (bi.tipo ?? "externo") &&
      (ai.cargo ?? null) === (bi.cargo ?? null) &&
      (ai.solicitarAprobacionCorreo ?? true) === (bi.solicitarAprobacionCorreo ?? true)
    );
  });
}

function sameCompromisosResumen(a: CompromisoItem[] | undefined, b: CompromisoItem[] | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((ac, i) => {
    const bc = b[i];
    return (
      ac.descripcion === bc.descripcion &&
      (ac.fechaLimite ?? null) === (bc.fechaLimite ?? null)
    );
  });
}

export function EvidenciaEdicionActa({ metadata }: Props) {
  const antes = metadata.antes;
  const despues = metadata.despues;
  if (!despues) return null;

  const cambióFecha = antes && antes.fecha !== despues.fecha;
  const cambióObjetivo = antes && antes.objetivo !== despues.objetivo;
  const cambióContenido =
    antes && (antes.contenido ?? "") !== (despues.contenido ?? "");
  const cambióIntegrantes =
    !antes || !sameIntegrantes(antes.integrantes, despues.integrantes);
  const cambióClientes =
    !antes || !sameArray(antes.clientesIds, despues.clientesIds);
  const cambióActividades =
    !antes || !sameArray(antes.actividadesIds, despues.actividadesIds);
  const cambióCompromisos =
    !antes || !sameCompromisosResumen(antes.compromisos, despues.compromisos);

  const hayAlgunCambio =
    cambióFecha ||
    cambióObjetivo ||
    cambióContenido ||
    cambióIntegrantes ||
    cambióClientes ||
    cambióActividades ||
    cambióCompromisos;

  return (
    <details className="w-full mt-1 rounded border border-border bg-background/80">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded [&::-webkit-details-marker]:hidden">
        Ver evidencia de cambios (auditoría)
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-3 text-xs border-t border-border">
        {!hayAlgunCambio && (
          <p className="text-muted-foreground">Sin cambios detectados en los datos registrados.</p>
        )}
        {cambióFecha && antes && (
          <section>
            <p className="font-medium text-foreground mb-1">Fecha</p>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <div><span className="text-muted-foreground/80">Antes:</span> {antes.fecha}</div>
              <div><span className="text-muted-foreground/80">Después:</span> {despues.fecha}</div>
            </div>
          </section>
        )}
        {cambióObjetivo && antes && (
          <section>
            <p className="font-medium text-foreground mb-1">Objetivo</p>
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground/80">Antes:</span>
                <p className="mt-0.5 rounded bg-muted/50 p-2 whitespace-pre-wrap">{antes.objetivo}</p>
              </div>
              <div>
                <span className="text-muted-foreground/80">Después:</span>
                <p className="mt-0.5 rounded bg-muted/50 p-2 whitespace-pre-wrap">{despues.objetivo}</p>
              </div>
            </div>
          </section>
        )}
        {cambióContenido && antes && (
          <section>
            <p className="font-medium text-foreground mb-1">Contenido</p>
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground/80">Antes:</span>
                <p className="mt-0.5 rounded bg-muted/50 p-2 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {antes.contenido ?? "(vacío)"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground/80">Después:</span>
                <p className="mt-0.5 rounded bg-muted/50 p-2 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {despues.contenido ?? "(vacío)"}
                </p>
              </div>
            </div>
          </section>
        )}
        {cambióIntegrantes && (
          <section>
            <p className="font-medium text-foreground mb-1">Integrantes</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground/80">Antes:</span>
                <ul className="mt-0.5 list-disc list-inside text-muted-foreground">
                  {antes?.integrantes?.length
                    ? antes.integrantes.map((i, idx) => (
                        <li key={idx}>{i.nombre} ({i.email})</li>
                      ))
                    : ["Ninguno"]}
                </ul>
              </div>
              <div>
                <span className="text-muted-foreground/80">Después:</span>
                <ul className="mt-0.5 list-disc list-inside text-muted-foreground">
                  {despues.integrantes?.length
                    ? despues.integrantes.map((i, idx) => (
                        <li key={idx}>{i.nombre} ({i.email})</li>
                      ))
                    : ["Ninguno"]}
                </ul>
              </div>
            </div>
          </section>
        )}
        {cambióClientes && (
          <section>
            <p className="font-medium text-foreground mb-1">Clientes (IDs)</p>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <div><span className="text-muted-foreground/80">Antes:</span> {antes?.clientesIds?.length ? antes.clientesIds.join(", ") : "Ninguno"}</div>
              <div><span className="text-muted-foreground/80">Después:</span> {despues.clientesIds?.length ? despues.clientesIds.join(", ") : "Ninguno"}</div>
            </div>
          </section>
        )}
        {cambióActividades && (
          <section>
            <p className="font-medium text-foreground mb-1">Actividades (IDs)</p>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <div><span className="text-muted-foreground/80">Antes:</span> {antes?.actividadesIds?.length ? antes.actividadesIds.join(", ") : "Ninguna"}</div>
              <div><span className="text-muted-foreground/80">Después:</span> {despues.actividadesIds?.length ? despues.actividadesIds.join(", ") : "Ninguna"}</div>
            </div>
          </section>
        )}
        {cambióCompromisos && (
          <section>
            <p className="font-medium text-foreground mb-1">Compromisos</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground/80">Antes:</span>
                <ul className="mt-0.5 list-disc list-inside text-muted-foreground space-y-0.5">
                  {antes?.compromisos?.length
                    ? antes.compromisos.map((c, idx) => (
                        <li key={idx}>{c.descripcion.slice(0, 60)}{c.descripcion.length > 60 ? "…" : ""} {c.fechaLimite ? `(${c.fechaLimite})` : ""}</li>
                      ))
                    : ["Ninguno"]}
                </ul>
              </div>
              <div>
                <span className="text-muted-foreground/80">Después:</span>
                <ul className="mt-0.5 list-disc list-inside text-muted-foreground space-y-0.5">
                  {despues.compromisos?.length
                    ? despues.compromisos.map((c, idx) => (
                        <li key={idx}>{c.descripcion.slice(0, 60)}{c.descripcion.length > 60 ? "…" : ""} {c.fechaLimite ? `(${c.fechaLimite})` : ""}</li>
                      ))
                    : ["Ninguno"]}
                </ul>
              </div>
            </div>
          </section>
        )}
      </div>
    </details>
  );
}
