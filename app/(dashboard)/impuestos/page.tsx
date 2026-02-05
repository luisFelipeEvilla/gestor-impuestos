import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { impuestos } from "@/lib/db/schema";
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
import { FiltroInactivos } from "./filtro-inactivos";
import { FiltroBusquedaImpuestos } from "./filtro-busqueda";

type Props = { searchParams: Promise<{ inactivos?: string; q?: string }> };

export default async function ImpuestosPage({ searchParams }: Props) {
  const { inactivos: inactivosParam, q: query } = await searchParams;
  const verInactivos = inactivosParam === "1";
  const busqueda = (query ?? "").trim();

  const condiciones = [];
  if (!verInactivos) condiciones.push(eq(impuestos.activo, true));
  if (busqueda.length > 0) {
    condiciones.push(
      or(
        ilike(impuestos.codigo, `%${busqueda}%`),
        ilike(impuestos.nombre, `%${busqueda}%`)
      )
    );
  }
  const whereCond =
    condiciones.length > 0 ? and(...condiciones) : undefined;

  const lista = await (whereCond
    ? db.select().from(impuestos).where(whereCond)
    : db.select().from(impuestos))
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
            Tipos de impuesto (nacional / municipal) para los procesos de cobro
            {verInactivos && " · Mostrando todos (incl. inactivos)"}
            {busqueda && " · Búsqueda aplicada"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay impuestos en el catálogo.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-20">Estado</TableHead>
                  <TableHead className="w-[80px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.codigo}</TableCell>
                    <TableCell>{i.nombre}</TableCell>
                    <TableCell className="capitalize">{i.tipo}</TableCell>
                    <TableCell>
                      {i.activo ? (
                        <span className="text-muted-foreground">Activo</span>
                      ) : (
                        <span className="text-destructive">Inactivo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" asChild>
                        <Link href={`/impuestos/${i.id}`}>Ver</Link>
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
