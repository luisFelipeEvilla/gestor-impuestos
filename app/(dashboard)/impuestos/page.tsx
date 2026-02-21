import Link from "next/link";
import { Suspense } from "react";
import { Receipt, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { impuestos, clientes } from "@/lib/db/schema";
import { eq, and, or, ilike, desc } from "drizzle-orm";
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
import { EmptyState } from "@/components/ui/empty-state";
import { FiltroInactivos } from "./filtro-inactivos";
import { FiltroBusquedaImpuestos } from "./filtro-busqueda";
import { unstable_noStore } from "next/cache";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = { searchParams: Promise<{ inactivos?: string; q?: string }> };

export default async function ImpuestosPage({ searchParams }: Props) {
  unstable_noStore();
  const { inactivos: inactivosParam, q: query } = await searchParams;
  const verInactivos = inactivosParam === "1";
  const busqueda = (query ?? "").trim();

  const condiciones = [];
  if (!verInactivos) condiciones.push(eq(impuestos.activo, true));
  if (busqueda.length > 0) {
    condiciones.push(ilike(impuestos.nombre, `%${busqueda}%`));
  }
  const whereCond =
    condiciones.length > 0 ? and(...condiciones) : undefined;

  const lista = await (whereCond
    ? db
        .select({
          id: impuestos.id,
          nombre: impuestos.nombre,
          naturaleza: impuestos.naturaleza,
          prescripcionMeses: impuestos.prescripcionMeses,
          activo: impuestos.activo,
          clienteNombre: clientes.nombre,
        })
        .from(impuestos)
        .leftJoin(clientes, eq(impuestos.clienteId, clientes.id))
        .where(whereCond)
    : db
        .select({
          id: impuestos.id,
          nombre: impuestos.nombre,
          naturaleza: impuestos.naturaleza,
          prescripcionMeses: impuestos.prescripcionMeses,
          activo: impuestos.activo,
          clienteNombre: clientes.nombre,
        })
        .from(impuestos)
        .leftJoin(clientes, eq(impuestos.clienteId, clientes.id)))
    .orderBy(desc(impuestos.createdAt));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Impuestos
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <FiltroBusquedaImpuestos valorActual={busqueda} verInactivos={verInactivos} />
          </Suspense>
          <FiltroInactivos verInactivos={verInactivos} query={busqueda} />
          <Button asChild>
            <Link href="/impuestos/nuevo">Nuevo impuesto</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Catálogo</CardTitle>
          <CardDescription>
            Catálogo de impuestos tributarios y no tributarios
            {verInactivos && " · Mostrando todos (incl. inactivos)"}
            {busqueda && " · Búsqueda aplicada"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <EmptyState
              icon={Receipt}
              message="No hay impuestos en el catálogo. Crea uno desde el botón Nuevo impuesto."
              action={{ href: "/impuestos/nuevo", label: "Nuevo impuesto →" }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Naturaleza</TableHead>
                  <TableHead>Prescripción</TableHead>
                  <TableHead className="w-20">Estado</TableHead>
                  <TableHead className="w-[80px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-muted-foreground">
                      {i.clienteNombre ?? "—"}
                    </TableCell>
                    <TableCell>{i.nombre}</TableCell>
                    <TableCell>{i.naturaleza === "no_tributario" ? "No tributario" : "Tributario"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {i.prescripcionMeses != null ? `${i.prescripcionMeses} meses` : "—"}
                    </TableCell>
                    <TableCell>
                      {i.activo ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Activo</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Inactivo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                        <Link href={`/impuestos/${i.id}`}>
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
    </div>
  );
}
