import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getTipoDocumentoLabel } from "@/lib/constants/tipo-documento";
import { db } from "@/lib/db";
import { contribuyentes, procesos, impuestos, vehiculos } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
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
import { EliminarContribuyenteButton } from "./botones-contribuyente";
import { labelEstado } from "@/lib/estados-proceso";
import { unstable_noStore } from "next/cache";

const ETIQUETAS_ESTADO_IMPUESTO: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-muted text-muted-foreground" },
  declarado: { label: "Declarado", className: "bg-blue-500/15 text-blue-700" },
  liquidado: { label: "Liquidado", className: "bg-yellow-500/15 text-yellow-700" },
  notificado: { label: "Notificado", className: "bg-orange-500/15 text-orange-700" },
  en_cobro_coactivo: { label: "Cobro coactivo", className: "bg-destructive/15 text-destructive" },
  pagado: { label: "Pagado", className: "bg-green-500/15 text-green-700" },
  cerrado: { label: "Cerrado", className: "bg-muted text-muted-foreground" },
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = { params: Promise<{ id: string }> };

export default async function DetalleContribuyentePage({ params }: Props) {
  unstable_noStore();
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [contribuyente] = await db
    .select()
    .from(contribuyentes)
    .where(eq(contribuyentes.id, id));
  if (!contribuyente) notFound();

  const session = await getSession();
  const whereContrib = eq(procesos.contribuyenteId, id);
  const wherePermiso =
    session?.user?.rol === "admin"
      ? undefined
      : session?.user?.id
        ? eq(procesos.asignadoAId, session.user.id)
        : eq(procesos.id, -1);
  const whereCond = wherePermiso ? and(whereContrib, wherePermiso) : whereContrib;
  const procesosList = await db
    .select({
      id: procesos.id,
      vigencia: procesos.vigencia,
      montoCop: procesos.montoCop,
      estadoActual: procesos.estadoActual,
    })
    .from(procesos)
    .where(whereCond)
    .orderBy(desc(procesos.vigencia));

  const impuestosList = await db
    .select({
      id: impuestos.id,
      tipoImpuesto: impuestos.tipoImpuesto,
      vigencia: impuestos.vigencia,
      impuestoDeterminado: impuestos.impuestoDeterminado,
      intereses: impuestos.intereses,
      totalAPagar: impuestos.totalAPagar,
      estadoActual: impuestos.estadoActual,
      placa: vehiculos.placa,
    })
    .from(impuestos)
    .leftJoin(vehiculos, eq(impuestos.vehiculoId, vehiculos.id))
    .where(eq(impuestos.contribuyenteId, id))
    .orderBy(desc(impuestos.vigencia));

  const cop = (v: string | number | null | undefined) =>
    v != null
      ? Number(v).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      : "—";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/contribuyentes">← Contribuyentes</Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/contribuyentes/${contribuyente.id}/editar`}>Editar</Link>
          </Button>
          <EliminarContribuyenteButton id={contribuyente.id} />
        </div>
      </div>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{contribuyente.nombreRazonSocial}</CardTitle>
          <CardDescription>
            {getTipoDocumentoLabel(contribuyente.tipoDocumento)}: {contribuyente.nit}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Tipo de documento</dt>
              <dd className="font-medium">
                {getTipoDocumentoLabel(contribuyente.tipoDocumento)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Número</dt>
              <dd className="font-medium">{contribuyente.nit}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Nombre / Razón social</dt>
              <dd className="font-medium">{contribuyente.nombreRazonSocial}</dd>
            </div>
            {contribuyente.telefono && (
              <div>
                <dt className="text-muted-foreground">Teléfono</dt>
                <dd>{contribuyente.telefono}</dd>
              </div>
            )}
            {contribuyente.email && (
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{contribuyente.email}</dd>
              </div>
            )}
            {contribuyente.direccion && (
              <div>
                <dt className="text-muted-foreground">Dirección</dt>
                <dd>{contribuyente.direccion}</dd>
              </div>
            )}
            {(contribuyente.ciudad || contribuyente.departamento) && (
              <div>
                <dt className="text-muted-foreground">Ciudad / Departamento</dt>
                <dd>
                  {[contribuyente.ciudad, contribuyente.departamento].filter(Boolean).join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle>Procesos de cobro</CardTitle>
          <CardDescription>
            Procesos asociados a este contribuyente
            {session?.user?.rol !== "admin" &&
              " (solo los asignados a ti)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {procesosList.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No hay procesos asociados
              {session?.user?.rol !== "admin" ? " que tengas asignados" : ""}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-muted-foreground">#</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Monto (COP)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[80px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {procesosList.map((p, index) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground text-sm tabular-nums">{index + 1}</TableCell>
                    <TableCell>{p.vigencia}</TableCell>
                    <TableCell>
                      {Number(p.montoCop).toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell>{labelEstado(p.estadoActual)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                        <Link href={`/comparendos/${p.id}`}>
                          Ver <ChevronRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle>Impuestos</CardTitle>
          <CardDescription>
            Registros de impuesto asociados a este contribuyente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {impuestosList.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No hay impuestos asociados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead className="text-right">Capital</TableHead>
                  <TableHead className="text-right">Intereses</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[80px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {impuestosList.map((imp) => {
                  const estadoInfo = ETIQUETAS_ESTADO_IMPUESTO[imp.estadoActual] ?? {
                    label: imp.estadoActual,
                    className: "bg-muted text-muted-foreground",
                  };
                  return (
                    <TableRow key={imp.id}>
                      <TableCell className="tabular-nums font-medium">{imp.vigencia}</TableCell>
                      <TableCell className="capitalize">{imp.tipoImpuesto.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        {imp.placa ? (
                          <Link
                            href={`/vehiculos?q=${imp.placa}`}
                            className="font-mono text-xs hover:underline text-primary"
                          >
                            {imp.placa}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{cop(imp.impuestoDeterminado)}</TableCell>
                      <TableCell className="text-right tabular-nums">{cop(imp.intereses)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{cop(imp.totalAPagar)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${estadoInfo.className}`}
                        >
                          {estadoInfo.label}
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
