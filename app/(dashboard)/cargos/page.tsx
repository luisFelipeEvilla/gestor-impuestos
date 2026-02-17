import Link from "next/link";
import { Briefcase, ChevronRight, Plus } from "lucide-react";
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
import { listarCargosEmpresaConOrden } from "@/lib/actions/cargos-empresa";
import { EliminarCargoButton } from "./boton-eliminar-cargo";
import { unstable_noStore } from "next/cache";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function CargosPage() {
  unstable_noStore();
  const lista = await listarCargosEmpresaConOrden();

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-1 w-12 rounded-full bg-primary"
            aria-hidden
          />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Cargos
          </h1>
        </div>
        <Button asChild>
          <Link href="/cargos/nuevo" className="gap-2">
            <Plus className="size-4" aria-hidden />
            Nuevo cargo
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Catálogo de cargos</CardTitle>
          <CardDescription>
            Cargos de la organización. Asígnelos a los empleados en Usuarios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              message="No hay cargos definidos. Crea uno para asignarlos a los empleados."
              action={{ href: "/cargos/nuevo", label: "Nuevo cargo →" }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-[180px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground">
                      {c.orden}
                    </TableCell>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-primary"
                          asChild
                        >
                          <Link href={`/cargos/${c.id}/editar`}>
                            Editar
                            <ChevronRight
                              className="size-4"
                              aria-hidden
                            />
                          </Link>
                        </Button>
                        <EliminarCargoButton id={c.id} />
                      </div>
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
