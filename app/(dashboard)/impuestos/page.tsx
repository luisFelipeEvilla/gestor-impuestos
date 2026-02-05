import Link from "next/link";
import { db } from "@/lib/db";
import { impuestos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

export default async function ImpuestosPage() {
  const lista = await db.select().from(impuestos).where(eq(impuestos.activo, true));

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Impuestos</h1>
        <Button asChild>
          <Link href="/impuestos/nuevo">Nuevo impuesto</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Catálogo</CardTitle>
          <CardDescription>
            Tipos de impuesto (nacional / municipal) para los procesos de cobro
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
