import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { procesos, impuestos, contribuyentes, usuarios } from "@/lib/db/schema";
import { desc, eq, and } from "drizzle-orm";
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
import { SemaforoFechaLimite } from "@/components/procesos/semaforo-fecha-limite";
import { FiltrosProcesos } from "./filtros-procesos";

const ESTADOS_VALIDOS = [
  "pendiente",
  "asignado",
  "notificado",
  "en_contacto",
  "en_negociacion",
  "cobrado",
  "incobrable",
  "en_cobro_coactivo",
  "suspendido",
] as const;

type Props = { searchParams: Promise<{ estado?: string; vigencia?: string }> };

export default async function ProcesosPage({ searchParams }: Props) {
  const { estado: estadoParam, vigencia: vigenciaParam } = await searchParams;
  const estadoActual =
    estadoParam != null && ESTADOS_VALIDOS.includes(estadoParam as (typeof ESTADOS_VALIDOS)[number])
      ? estadoParam
      : null;
  const vigenciaNum =
    vigenciaParam != null && /^\d{4}$/.test(vigenciaParam)
      ? parseInt(vigenciaParam, 10)
      : null;

  const condiciones = [];
  if (estadoActual != null) condiciones.push(eq(procesos.estadoActual, estadoActual));
  if (vigenciaNum != null) condiciones.push(eq(procesos.vigencia, vigenciaNum));
  const whereCond =
    condiciones.length > 0 ? and(...condiciones) : undefined;

  const baseQuery = db
    .select({
      id: procesos.id,
      vigencia: procesos.vigencia,
      periodo: procesos.periodo,
      montoCop: procesos.montoCop,
      estadoActual: procesos.estadoActual,
      numeroResolucion: procesos.numeroResolucion,
      fechaLimite: procesos.fechaLimite,
      impuestoCodigo: impuestos.codigo,
      impuestoNombre: impuestos.nombre,
      contribuyenteNombre: contribuyentes.nombreRazonSocial,
      contribuyenteNit: contribuyentes.nit,
      asignadoNombre: usuarios.nombre,
    })
    .from(procesos)
    .innerJoin(impuestos, eq(procesos.impuestoId, impuestos.id))
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
    .leftJoin(usuarios, eq(procesos.asignadoAId, usuarios.id));

  const lista = await (whereCond
    ? baseQuery.where(whereCond)
    : baseQuery)
    .orderBy(desc(procesos.creadoEn))
    .limit(50);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Procesos de cobro
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <FiltrosProcesos
              estadoActual={estadoActual}
              vigenciaActual={vigenciaNum}
            />
          </Suspense>
          <Button asChild>
            <Link href="/procesos/nuevo">Nuevo proceso</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>
            Procesos ordenados por fecha de creación (más recientes primero)
            {(estadoActual != null || vigenciaNum != null) &&
              " · Filtros aplicados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay procesos. Crea uno desde &quot;Nuevo proceso&quot;.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Impuesto</TableHead>
                  <TableHead>Contribuyente</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Nº resolución</TableHead>
                  <TableHead>Monto (COP)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Fecha límite</TableHead>
                  <TableHead>Asignado</TableHead>
                  <TableHead className="w-[80px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.id}</TableCell>
                    <TableCell className="font-medium">
                      {p.impuestoCodigo}
                    </TableCell>
                    <TableCell>
                      {p.contribuyenteNombre}
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({p.contribuyenteNit})
                      </span>
                    </TableCell>
                    <TableCell>{p.vigencia}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.numeroResolucion ?? "—"}
                    </TableCell>
                    <TableCell>
                      {Number(p.montoCop).toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell className="capitalize">
                      {p.estadoActual?.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-center">
                      <SemaforoFechaLimite
                        fechaLimite={p.fechaLimite}
                        variant="pill"
                        className="justify-center"
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.asignadoNombre ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" asChild>
                        <Link href={`/procesos/${p.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
