import Link from "next/link";
import { db } from "@/lib/db";
import { procesos, impuestos, contribuyentes, usuarios } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
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

export default async function ProcesosPage() {
  const lista = await db
    .select({
      id: procesos.id,
      vigencia: procesos.vigencia,
      periodo: procesos.periodo,
      montoCop: procesos.montoCop,
      estadoActual: procesos.estadoActual,
      impuestoCodigo: impuestos.codigo,
      impuestoNombre: impuestos.nombre,
      contribuyenteNombre: contribuyentes.nombreRazonSocial,
      contribuyenteNit: contribuyentes.nit,
      asignadoNombre: usuarios.nombre,
    })
    .from(procesos)
    .innerJoin(impuestos, eq(procesos.impuestoId, impuestos.id))
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
    .leftJoin(usuarios, eq(procesos.asignadoAId, usuarios.id))
    .orderBy(desc(procesos.creadoEn))
    .limit(50);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Procesos de cobro
        </h1>
        <Button asChild>
          <Link href="/procesos/nuevo">Nuevo proceso</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>
            Procesos ordenados por fecha de creación (más recientes primero)
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
                  <TableHead>Monto (COP)</TableHead>
                  <TableHead>Estado</TableHead>
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
                    <TableCell>
                      {Number(p.montoCop).toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell className="capitalize">
                      {p.estadoActual?.replace(/_/g, " ")}
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
