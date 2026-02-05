import Link from "next/link";
import { db } from "@/lib/db";
import { procesos } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
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
    .select()
    .from(procesos)
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
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Monto (COP)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[80px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.id}</TableCell>
                    <TableCell>{p.vigencia}</TableCell>
                    <TableCell>{p.montoCop}</TableCell>
                    <TableCell className="capitalize">
                      {p.estadoActual?.replace(/_/g, " ")}
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
