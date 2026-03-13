import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { vehiculos, contribuyentes, impuestos } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EliminarVehiculoButton } from "./botones-vehiculo";
import { unstable_noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ETIQUETAS_ESTADO: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-muted text-muted-foreground" },
  declarado: { label: "Declarado", className: "bg-blue-500/15 text-blue-700" },
  liquidado: { label: "Liquidado", className: "bg-yellow-500/15 text-yellow-700" },
  notificado: { label: "Notificado", className: "bg-orange-500/15 text-orange-700" },
  en_cobro_coactivo: { label: "Cobro coactivo", className: "bg-destructive/15 text-destructive" },
  pagado: { label: "Pagado", className: "bg-success/15 text-success" },
  cerrado: { label: "Cerrado", className: "bg-muted text-muted-foreground" },
};

const cop = (val: string | null | undefined) =>
  val != null
    ? new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(Number(val))
    : "—";

type Props = { params: Promise<{ id: string }> };

export default async function DetalleVehiculoPage({ params }: Props) {
  unstable_noStore();
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [row] = await db
    .select({
      id: vehiculos.id,
      placa: vehiculos.placa,
      modelo: vehiculos.modelo,
      clase: vehiculos.clase,
      marca: vehiculos.marca,
      linea: vehiculos.linea,
      cilindraje: vehiculos.cilindraje,
      creadoEn: vehiculos.creadoEn,
      contribuyenteId: contribuyentes.id,
      contribuyenteNombre: contribuyentes.nombreRazonSocial,
      contribuyenteNit: contribuyentes.nit,
      contribuyenteTipoDoc: contribuyentes.tipoDocumento,
    })
    .from(vehiculos)
    .leftJoin(contribuyentes, eq(vehiculos.contribuyenteId, contribuyentes.id))
    .where(eq(vehiculos.id, id));

  if (!row) notFound();

  const impuestosList = await db
    .select({
      id: impuestos.id,
      vigencia: impuestos.vigencia,
      impuestoDeterminado: impuestos.impuestoDeterminado,
      intereses: impuestos.intereses,
      totalAPagar: impuestos.totalAPagar,
      estadoActual: impuestos.estadoActual,
    })
    .from(impuestos)
    .where(eq(impuestos.vehiculoId, id))
    .orderBy(desc(impuestos.vigencia));

  const totalDeuda = impuestosList.reduce(
    (acc, i) => acc + Number(i.totalAPagar ?? 0),
    0
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/vehiculos">← Vehículos</Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/vehiculos/${id}/editar`}>Editar</Link>
          </Button>
          <EliminarVehiculoButton id={id} />
        </div>
      </div>

      {/* Datos del vehículo */}
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="font-mono text-2xl tracking-widest">{row.placa}</CardTitle>
          <CardDescription>
            {[row.marca, row.linea].filter(Boolean).join(" · ") || "Vehículo"}
            {row.modelo ? ` · Modelo ${row.modelo}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Clase</dt>
              <dd className="font-medium">{row.clase || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Marca</dt>
              <dd className="font-medium">{row.marca || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Línea / Referencia</dt>
              <dd className="font-medium">{row.linea || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Año modelo</dt>
              <dd className="font-medium">{row.modelo ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cilindraje</dt>
              <dd className="font-medium">{row.cilindraje != null ? `${row.cilindraje} cc` : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Propietario</dt>
              <dd className="font-medium">
                {row.contribuyenteId ? (
                  <Link
                    href={`/contribuyentes/${row.contribuyenteId}`}
                    className="text-primary hover:underline"
                  >
                    {row.contribuyenteNombre}
                  </Link>
                ) : (
                  "—"
                )}
                {row.contribuyenteNit && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {row.contribuyenteNit}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Impuestos asociados */}
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle>Impuestos vehiculares</CardTitle>
          <CardDescription>
            {impuestosList.length} vigencia{impuestosList.length !== 1 ? "s" : ""} registrada{impuestosList.length !== 1 ? "s" : ""}
            {impuestosList.length > 0 && (
              <> · Deuda total: <span className="font-semibold text-foreground">{cop(totalDeuda.toFixed(2))}</span></>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {impuestosList.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No hay impuestos registrados para este vehículo.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Capital</TableHead>
                  <TableHead>Intereses</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[80px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {impuestosList.map((imp) => {
                  const estado = ETIQUETAS_ESTADO[imp.estadoActual] ?? {
                    label: imp.estadoActual,
                    className: "bg-muted text-muted-foreground",
                  };
                  return (
                    <TableRow key={imp.id}>
                      <TableCell className="font-medium tabular-nums">{imp.vigencia}</TableCell>
                      <TableCell className="tabular-nums">{cop(imp.impuestoDeterminado)}</TableCell>
                      <TableCell className="tabular-nums">{cop(imp.intereses)}</TableCell>
                      <TableCell className="font-semibold tabular-nums">{cop(imp.totalAPagar)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${estado.className}`}>
                          {estado.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                          <Link href={`/impuestos/${imp.id}`}>
                            Ver <ChevronRight className="size-4" aria-hidden />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
