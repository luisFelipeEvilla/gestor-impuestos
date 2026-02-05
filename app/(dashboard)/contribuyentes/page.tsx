import Link from "next/link";
import { db } from "@/lib/db";
import { contribuyentes } from "@/lib/db/schema";
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

export default async function ContribuyentesPage() {
  const lista = await db
    .select()
    .from(contribuyentes)
    .orderBy(desc(contribuyentes.createdAt))
    .limit(50);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Contribuyentes
        </h1>
        <Button asChild>
          <Link href="/contribuyentes/nuevo">Nuevo contribuyente</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>
            Personas o entidades a las que se realiza el cobro (NIT / cédula)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay contribuyentes registrados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIT</TableHead>
                  <TableHead>Nombre / Razón social</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead className="w-[80px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.nit}</TableCell>
                    <TableCell>{c.nombreRazonSocial}</TableCell>
                    <TableCell>{c.ciudad ?? "—"}</TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" asChild>
                        <Link href={`/contribuyentes/${c.id}`}>Ver</Link>
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
