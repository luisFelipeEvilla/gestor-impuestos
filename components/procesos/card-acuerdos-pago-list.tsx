"use client";

import { useActionState, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmarEliminacionModal } from "@/components/confirmar-eliminacion-modal";
import {
  crearAcuerdoPago,
  actualizarAcuerdoPago,
  eliminarAcuerdoPago,
} from "@/lib/actions/acuerdos-pago";
import type { AcuerdoPago } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import {
  AgregarNotaForm,
  ListaNotas,
  AccionEstadoForm,
} from "@/components/procesos/acciones-gestion";
import type { NotaItem } from "@/components/procesos/acciones-gestion";
import {
  ListaDocumentos,
  SubirDocumentoForm,
} from "@/components/procesos/documentos-proceso";
import type { DocumentoItem } from "@/components/procesos/documentos-proceso";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CO");
}

const CATEGORIA_ACUERDO_PAGO = "acuerdo_pago" as const;

type CardAcuerdosPagoListProps = {
  procesoId: number;
  acuerdos: AcuerdoPago[];
  estadoActual?: string;
  documentos?: DocumentoItem[];
  notas?: NotaItem[];
  /** Monto total del proceso (COP) para mostrar contexto al definir cuotas. */
  montoTotalCop?: string | number | null;
  sessionUser?: { id: number; rol: string } | null;
};

export function CardAcuerdosPagoList({
  procesoId,
  acuerdos: initialAcuerdos,
  estadoActual,
  documentos = [],
  notas = [],
  montoTotalCop,
  sessionUser,
}: CardAcuerdosPagoListProps) {
  const showEtapa = estadoActual != null;
  const enAcuerdoPago = estadoActual === "acuerdo_pago";
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [openEliminar, setOpenEliminar] = useState(false);
  const formEliminarRef = useRef<HTMLFormElement | null>(null);
  const confirmandoEliminarRef = useRef(false);

  const parseNum = (v: FormDataEntryValue | null) => (v != null && v !== "" ? Number(String(v)) : null);

  const [createState, createAction] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      const r = await crearAcuerdoPago(
        procesoId,
        (formData.get("numeroAcuerdo") as string)?.trim() ?? "",
        (formData.get("fechaAcuerdo") as string)?.trim() || null,
        (formData.get("fechaInicio") as string)?.trim() || null,
        parseNum(formData.get("cuotas")),
        parseNum(formData.get("porcentajeCuotaInicial")),
        parseNum(formData.get("diaCobroMes"))
      );
      if (r?.error) return r;
      setAdding(false);
      router.refresh();
      return {};
    },
    null
  );

  const [updateState, updateAction] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      const id = Number(formData.get("id"));
      const r = await actualizarAcuerdoPago(
        id,
        procesoId,
        (formData.get("numeroAcuerdo") as string)?.trim() ?? "",
        (formData.get("fechaAcuerdo") as string)?.trim() || null,
        (formData.get("fechaInicio") as string)?.trim() || null,
        parseNum(formData.get("cuotas")),
        parseNum(formData.get("porcentajeCuotaInicial")),
        parseNum(formData.get("diaCobroMes"))
      );
      if (r?.error) return r;
      setEditingId(null);
      router.refresh();
      return {};
    },
    null
  );

  const [deleteState, deleteAction] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      const r = await eliminarAcuerdoPago(Number(formData.get("id")), procesoId);
      if (r?.error) return r;
      router.refresh();
      return {};
    },
    null
  );

  const montoFormateado =
    montoTotalCop != null && montoTotalCop !== ""
      ? Number(montoTotalCop).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
      : null;

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Acuerdos de pago</CardTitle>
          {montoFormateado && (
            <CardDescription className="font-medium text-foreground/90">
              Monto del proceso: {montoFormateado}
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      <ConfirmarEliminacionModal
        open={openEliminar}
        onOpenChange={setOpenEliminar}
        title="Eliminar acuerdo de pago"
        description="Se eliminará el registro. No se puede deshacer."
        onConfirm={() => {
          confirmandoEliminarRef.current = true;
          formEliminarRef.current?.requestSubmit();
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Registro de acuerdos</CardTitle>
          <CardDescription>
            Número del acuerdo, fechas, cuotas, porcentaje de cuota inicial y día del mes de cobro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
        {initialAcuerdos.length > 0 && (
          <ul className="space-y-2 text-sm">
            {initialAcuerdos.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3",
                  editingId === a.id && "border-primary"
                )}
              >
                {editingId === a.id ? (
                  <form action={updateAction} className="flex w-full flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="procesoId" value={procesoId} />
                    <div className="grid gap-1">
                      <Label className="text-xs">Nº acuerdo</Label>
                      <Input name="numeroAcuerdo" defaultValue={a.numeroAcuerdo} className="h-8 w-40" required />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Fecha acuerdo</Label>
                      <Input
                        name="fechaAcuerdo"
                        type="date"
                        defaultValue={a.fechaAcuerdo ? String(a.fechaAcuerdo).slice(0, 10) : ""}
                        className="h-8 w-36"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Fecha inicio</Label>
                      <Input
                        name="fechaInicio"
                        type="date"
                        defaultValue={a.fechaInicio ? String(a.fechaInicio).slice(0, 10) : ""}
                        className="h-8 w-36"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Cuotas</Label>
                      <Input
                        name="cuotas"
                        type="number"
                        min={1}
                        required
                        defaultValue={a.cuotas ?? ""}
                        className="h-8 w-20"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">% cuota inicial</Label>
                      <Input
                        name="porcentajeCuotaInicial"
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        required
                        defaultValue={a.porcentajeCuotaInicial ?? ""}
                        className="h-8 w-24"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Día cobro (mes)</Label>
                      <Input
                        name="diaCobroMes"
                        type="number"
                        min={1}
                        max={31}
                        required
                        defaultValue={a.diaCobroMes ?? ""}
                        className="h-8 w-20"
                      />
                    </div>
                    <Button type="submit" size="sm">
                      Guardar
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                  </form>
                ) : (
                  <>
                    <div>
                      <span className="font-medium">{a.numeroAcuerdo}</span>
                      <span className="text-muted-foreground ml-2">
                        Fecha: {formatDate(a.fechaAcuerdo)} · Inicio: {formatDate(a.fechaInicio)}
                        {" · "}
                        {Number(a.porcentajeCuotaInicial)}% inicial · {a.cuotas} cuotas · cobro día {a.diaCobroMes}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(a.id)}>
                        Editar
                      </Button>
                      <form
                        action={deleteAction}
                        onSubmit={(e) => {
                          if (!confirmandoEliminarRef.current) {
                            e.preventDefault();
                            formEliminarRef.current = e.currentTarget;
                            setOpenEliminar(true);
                            return;
                          }
                          confirmandoEliminarRef.current = false;
                        }}
                      >
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="procesoId" value={procesoId} />
                        <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                          Eliminar
                        </Button>
                      </form>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {deleteState?.error && (
          <p className="text-destructive text-sm" role="alert">
            {deleteState.error}
          </p>
        )}
        <Dialog open={adding} onOpenChange={setAdding}>
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            Agregar acuerdo de pago
          </Button>
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo acuerdo de pago</DialogTitle>
            </DialogHeader>
            <form action={createAction} className="space-y-4">
              <input type="hidden" name="procesoId" value={procesoId} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="numeroAcuerdo-new">Nº del acuerdo</Label>
                  <Input id="numeroAcuerdo-new" name="numeroAcuerdo" required placeholder="Ej. AP-001-2026" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="fechaAcuerdo-new">Fecha del acuerdo</Label>
                  <Input id="fechaAcuerdo-new" name="fechaAcuerdo" type="date" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="fechaInicio-new">Fecha de inicio</Label>
                  <Input id="fechaInicio-new" name="fechaInicio" type="date" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cuotas-new">Número de cuotas</Label>
                  <Input id="cuotas-new" name="cuotas" type="number" min={1} required placeholder="Ej. 6" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="porcentajeCuotaInicial-new">Porcentaje cuota inicial (%)</Label>
                  <Input
                    id="porcentajeCuotaInicial-new"
                    name="porcentajeCuotaInicial"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    required
                    placeholder="Ej. 20"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="diaCobroMes-new">Día del mes de cobro (1-31)</Label>
                  <Input
                    id="diaCobroMes-new"
                    name="diaCobroMes"
                    type="number"
                    min={1}
                    max={31}
                    required
                    placeholder="Ej. 15"
                  />
                </div>
              </div>
              {createState?.error && (
                <p className="text-destructive text-sm" role="alert">
                  {createState.error}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAdding(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Agregar acuerdo</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </CardContent>
      </Card>

      {showEtapa && enAcuerdoPago && (
        <Card>
          <CardHeader>
            <CardTitle>Acciones de estado</CardTitle>
            <CardDescription>
              Según el resultado del acuerdo, finaliza el proceso o pásalo a cobro coactivo por incumplimiento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Acuerdo cumplido</p>
              <AccionEstadoForm
                procesoId={procesoId}
                estadoDestino="finalizado"
                label="Finalizar (acuerdo cumplido)"
                variant="default"
              />
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Incumplimiento del acuerdo</p>
              <AccionEstadoForm
                procesoId={procesoId}
                estadoDestino="en_cobro_coactivo"
                label="Pasar a cobro coactivo (por incumplimiento)"
                variant="destructive"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
          <CardDescription>
            Acuerdo de pago firmado, liquidaciones y constancias de esta etapa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SubirDocumentoForm procesoId={procesoId} categoria={CATEGORIA_ACUERDO_PAGO} />
          <ListaDocumentos procesoId={procesoId} documentos={documentos} puedeEliminar />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comentarios</CardTitle>
          <CardDescription>
            Notas y seguimiento del acuerdo de pago.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AgregarNotaForm procesoId={procesoId} categoria={CATEGORIA_ACUERDO_PAGO} />
          <ListaNotas notas={notas} procesoId={procesoId} sessionUser={sessionUser} />
        </CardContent>
      </Card>
    </div>
  );
}
