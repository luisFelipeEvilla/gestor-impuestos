import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ChevronRight,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  importacionesAcuerdos,
  usuarios,
  acuerdosPago,
  procesos,
  contribuyentes,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSession } from "@/lib/auth-server";
import { unstable_noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; className: string }> = {
    procesando: {
      label: "Procesando",
      className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200",
    },
    completado: {
      label: "Completado",
      className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200",
    },
    completado_con_errores: {
      label: "Completado con errores",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200",
    },
    fallido: {
      label: "Fallido",
      className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200",
    },
  };
  const cfg = map[estado] ?? {
    label: estado,
    className: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}

export default async function ImportacionAcuerdosDetallePage({ params }: Props) {
  unstable_noStore();
  const session = await getSession();
  if (session?.user?.rol !== "admin") {
    redirect("/procesos");
  }

  const { id: idRaw } = await params;
  const id = parseInt(idRaw, 10);
  if (Number.isNaN(id)) notFound();

  const [row] = await db
    .select({
      id: importacionesAcuerdos.id,
      nombreArchivo: importacionesAcuerdos.nombreArchivo,
      totalRegistros: importacionesAcuerdos.totalRegistros,
      importados: importacionesAcuerdos.importados,
      fallidos: importacionesAcuerdos.fallidos,
      omitidos: importacionesAcuerdos.omitidos,
      estado: importacionesAcuerdos.estado,
      creadoEn: importacionesAcuerdos.creadoEn,
      usuarioNombre: usuarios.nombre,
    })
    .from(importacionesAcuerdos)
    .leftJoin(usuarios, eq(importacionesAcuerdos.usuarioId, usuarios.id))
    .where(eq(importacionesAcuerdos.id, id));

  if (!row) notFound();

  const acuerdosImportados = await db
    .select({
      id: acuerdosPago.id,
      numeroAcuerdo: acuerdosPago.numeroAcuerdo,
      fechaAcuerdo: acuerdosPago.fechaAcuerdo,
      cuotas: acuerdosPago.cuotas,
      procesoId: procesos.id,
      noComparendo: procesos.noComparendo,
      contribuyenteNombre: contribuyentes.nombreRazonSocial,
    })
    .from(acuerdosPago)
    .innerJoin(procesos, eq(acuerdosPago.procesoId, procesos.id))
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
    .where(eq(acuerdosPago.importacionId, id))
    .orderBy(asc(acuerdosPago.id));

  const fechaFormateada = row.creadoEn.toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/importaciones/acuerdos" className="hover:text-foreground transition-colors">
            Importaciones · Acuerdos
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="text-foreground">#{row.id}</span>
        </nav>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Importación de acuerdos #{row.id}
            </h1>
          </div>
          <Button asChild>
            <Link href="/procesos/importar">
              <Upload className="size-4 mr-2" aria-hidden />
              Nueva importación
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Información general</CardTitle>
              <CardDescription>{fechaFormateada}</CardDescription>
            </div>
            <EstadoBadge estado={row.estado} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Archivo
              </span>
              <span className="font-mono text-sm break-all">{row.nombreArchivo}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Importado por
              </span>
              <span className="text-sm">{row.usuarioNombre ?? "—"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="size-8 text-muted-foreground shrink-0" />
              <div>
                <p className="text-2xl font-bold">
                  {row.totalRegistros.toLocaleString("es-CO")}
                </p>
                <p className="text-xs text-muted-foreground">Total filas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-8 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {row.importados.toLocaleString("es-CO")}
                </p>
                <p className="text-xs text-muted-foreground">Importados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MinusCircle className="size-8 text-muted-foreground shrink-0" />
              <div>
                <p className="text-2xl font-bold">
                  {row.omitidos.toLocaleString("es-CO")}
                </p>
                <p className="text-xs text-muted-foreground">Omitidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle
                className={`size-8 shrink-0 ${row.fallidos > 0 ? "text-destructive" : "text-muted-foreground"}`}
              />
              <div>
                <p
                  className={`text-2xl font-bold ${row.fallidos > 0 ? "text-destructive" : ""}`}
                >
                  {row.fallidos.toLocaleString("es-CO")}
                </p>
                <p className="text-xs text-muted-foreground">Fallidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" aria-hidden />
              Acuerdos importados
            </CardTitle>
            <CardDescription>
              {acuerdosImportados.length === 0
                ? "No hay acuerdos asociados a esta importación."
                : `${acuerdosImportados.length.toLocaleString("es-CO")} acuerdo(s) de pago creado(s) en esta importación.`}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/procesos">
              Ver procesos <ChevronRight className="size-4 ml-1" aria-hidden />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {acuerdosImportados.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Los acuerdos importados se listan aquí. Si la importación recién terminó y no
              aparece ninguno, recargue la página.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Comparendo</TableHead>
                    <TableHead>N° Acuerdo</TableHead>
                    <TableHead>Contribuyente</TableHead>
                    <TableHead className="text-right">Cuotas</TableHead>
                    <TableHead>Fecha acuerdo</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acuerdosImportados.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">
                        {a.noComparendo ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {a.numeroAcuerdo}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {a.contribuyenteNombre ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {a.cuotas.toLocaleString("es-CO")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {a.fechaAcuerdo
                          ? new Date(a.fechaAcuerdo).toLocaleDateString("es-CO", {
                              timeZone: "UTC",
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                          <Link href={`/procesos/${a.procesoId}`}>
                            Ver <ChevronRight className="size-4" aria-hidden />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
