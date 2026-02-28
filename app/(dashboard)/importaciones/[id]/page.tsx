import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Upload, FileText, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { db } from "@/lib/db";
import { importacionesProcesos, usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth-server";
import { unstable_noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; className: string }> = {
    procesando: {
      label: "Procesando",
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
    completado: {
      label: "Completado",
      className: "bg-green-100 text-green-800 border-green-200",
    },
    completado_con_errores: {
      label: "Completado con errores",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    fallido: {
      label: "Fallido",
      className: "bg-red-100 text-red-800 border-red-200",
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

export default async function ImportacionDetallePage({ params }: Props) {
  unstable_noStore();
  const { id: idRaw } = await params;
  const id = parseInt(idRaw, 10);
  if (Number.isNaN(id)) notFound();

  const session = await getSession();

  const [row] = await db
    .select({
      id: importacionesProcesos.id,
      nombreArchivo: importacionesProcesos.nombreArchivo,
      totalRegistros: importacionesProcesos.totalRegistros,
      exitosos: importacionesProcesos.exitosos,
      fallidos: importacionesProcesos.fallidos,
      omitidos: importacionesProcesos.omitidos,
      estado: importacionesProcesos.estado,
      creadoEn: importacionesProcesos.creadoEn,
      usuarioNombre: usuarios.nombre,
    })
    .from(importacionesProcesos)
    .leftJoin(usuarios, eq(importacionesProcesos.usuarioId, usuarios.id))
    .where(eq(importacionesProcesos.id, id));

  if (!row) notFound();

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
      {/* Breadcrumb */}
      <div className="flex flex-col gap-2">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link
            href="/importaciones"
            className="hover:text-foreground transition-colors"
          >
            Importaciones
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="text-foreground">Detalle #{row.id}</span>
        </nav>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Importación #{row.id}
            </h1>
          </div>
          {session?.user?.rol === "admin" && (
            <Button asChild>
              <Link href="/procesos/importar">
                <Upload className="size-4 mr-2" aria-hidden />
                Nueva importación
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Metadata */}
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
              <span className="font-mono text-sm break-all">
                {row.nombreArchivo}
              </span>
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="size-8 text-muted-foreground shrink-0" />
              <div>
                <p className="text-2xl font-bold">
                  {row.totalRegistros.toLocaleString("es-CO")}
                </p>
                <p className="text-xs text-muted-foreground">Total registros</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-8 text-green-600 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-green-700">
                  {row.exitosos.toLocaleString("es-CO")}
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

      {/* Link to processes */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Los procesos importados en esta sesión están disponibles en el
              listado de procesos.
            </p>
            <Button variant="outline" asChild>
              <Link href="/procesos">
                Ver procesos <ChevronRight className="size-4 ml-1" aria-hidden />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
