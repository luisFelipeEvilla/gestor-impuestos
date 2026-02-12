import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { obtenerActas } from "@/lib/actions/actas";
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

const ESTADOS: { value: string; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "pendiente_aprobacion", label: "Pendiente aprobación" },
  { value: "aprobada", label: "Aprobada" },
  { value: "enviada", label: "Enviada" },
];

type Props = {
  searchParams: Promise<{ estado?: string }>;
};

export default async function ActasPage({ searchParams }: Props) {
  const params = await searchParams;
  const estadoParam =
    params.estado && ESTADOS.some((e) => e.value === params.estado)
      ? params.estado
      : undefined;

  const lista = await obtenerActas(
    estadoParam ? { estado: estadoParam as "borrador" | "pendiente_aprobacion" | "aprobada" | "enviada" } : undefined
  );

  const labelEstado: Record<string, string> = {
    borrador: "Borrador",
    pendiente_aprobacion: "Pendiente aprobación",
    aprobada: "Aprobada",
    enviada: "Enviada",
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Actas de reunión
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm sr-only sm:not-sr-only">Estado:</span>
          <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted/70 p-1" role="group" aria-label="Filtrar por estado">
            <Link
              href="/actas"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${!estadoParam ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
            >
              Todos
            </Link>
            {ESTADOS.map((e) => (
              <Link
                key={e.value}
                href={`/actas?estado=${e.value}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${estadoParam === e.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
              >
                {e.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex justify-end w-full">
          <Button asChild>
            <Link href="/actas/nuevo">Nueva acta</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>
            Actas ordenadas por fecha de creación (más recientes primero)
            {estadoParam && ` · Estado: ${labelEstado[estadoParam] ?? estadoParam}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <EmptyState
              icon={FileText}
              message="No hay actas. Crea una desde el botón Nueva acta."
              action={{ href: "/actas/nuevo", label: "Crear acta →" }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creador</TableHead>
                  <TableHead className="text-center">Integrantes</TableHead>
                  <TableHead className="w-[80px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.id}</TableCell>
                    <TableCell>
                      {new Date(a.fecha).toLocaleDateString("es-CO", {
                        dateStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {a.objetivo}
                    </TableCell>
                    <TableCell className="capitalize">
                      {labelEstado[a.estado] ?? a.estado.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.creadorNombre ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {a.numIntegrantes}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                        <Link href={`/actas/${a.id}`}>
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
