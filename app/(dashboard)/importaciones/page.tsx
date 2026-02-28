import Link from "next/link";
import { redirect } from "next/navigation";
import { Upload, ChevronRight, FileText } from "lucide-react";
import { db } from "@/lib/db";
import { importacionesProcesos, importacionesAcuerdos, usuarios } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { parsePerPage } from "@/lib/pagination";
import { unstable_noStore } from "next/cache";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnaTabla } from "@/components/ui/data-table";
import { Paginacion } from "@/components/ui/paginacion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FilaProcesos = {
  id: number;
  nombreArchivo: string;
  totalRegistros: number;
  exitosos: number;
  fallidos: number;
  omitidos: number;
  estado: string;
  creadoEn: Date;
  usuarioNombre: string | null;
};

type FilaAcuerdos = {
  id: number;
  nombreArchivo: string;
  totalRegistros: number;
  importados: number;
  fallidos: number;
  omitidos: number;
  estado: string;
  creadoEn: Date;
  usuarioNombre: string | null;
};

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
      label: "Con errores",
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

type Props = {
  searchParams: Promise<{ page?: string; pageAcuerdos?: string; perPage?: string }>;
};

function buildUrl(params: {
  page?: number;
  pageAcuerdos?: number;
  perPage?: number;
}): string {
  const sp = new URLSearchParams();
  if (params.perPage != null) sp.set("perPage", String(params.perPage));
  if (params.page != null && params.page > 1) sp.set("page", String(params.page));
  if (params.pageAcuerdos != null && params.pageAcuerdos > 1)
    sp.set("pageAcuerdos", String(params.pageAcuerdos));
  const s = sp.toString();
  return s ? `/importaciones?${s}` : "/importaciones";
}

export default async function ImportacionesPage({ searchParams }: Props) {
  unstable_noStore();
  const session = await getSession();
  if (session?.user?.rol !== "admin") {
    redirect("/procesos");
  }

  const params = await searchParams;
  const pageSize = parsePerPage(params.perPage);
  const pageRaw = params.page ? parseInt(params.page, 10) : 1;
  const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
  const pageAcuerdosRaw = params.pageAcuerdos ? parseInt(params.pageAcuerdos, 10) : 1;
  const pageAcuerdos =
    Number.isNaN(pageAcuerdosRaw) || pageAcuerdosRaw < 1 ? 1 : pageAcuerdosRaw;

  const [countResult] = await db
    .select({ count: count() })
    .from(importacionesProcesos);
  const total = Number(countResult?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;

  const listaProcesos = await db
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
    .orderBy(desc(importacionesProcesos.creadoEn))
    .limit(pageSize)
    .offset(offset);

  const [countAcuerdosResult] = await db
    .select({ count: count() })
    .from(importacionesAcuerdos);
  const totalAcuerdos = Number(countAcuerdosResult?.count ?? 0);
  const totalPagesAcuerdos = Math.max(1, Math.ceil(totalAcuerdos / pageSize));
  const currentPageAcuerdos = Math.min(pageAcuerdos, totalPagesAcuerdos);
  const offsetAcuerdos = (currentPageAcuerdos - 1) * pageSize;

  const listaAcuerdos = await db
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
    .orderBy(desc(importacionesAcuerdos.creadoEn))
    .limit(pageSize)
    .offset(offsetAcuerdos);

  const columnasProcesos: ColumnaTabla<FilaProcesos>[] = [
    {
      key: "archivo",
      encabezado: "Archivo",
      celda: (f) => (
        <span className="font-mono text-xs">{f.nombreArchivo}</span>
      ),
    },
    {
      key: "usuario",
      encabezado: "Usuario",
      celda: (f) => f.usuarioNombre ?? "—",
    },
    {
      key: "fecha",
      encabezado: "Fecha",
      celda: (f) =>
        f.creadoEn.toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    },
    {
      key: "total",
      encabezado: "Total",
      className: "text-right",
      celda: (f) => f.totalRegistros.toLocaleString("es-CO"),
    },
    {
      key: "exitosos",
      encabezado: "Exitosos",
      className: "text-right",
      celda: (f) => (
        <span className="text-green-700 dark:text-green-400">
          {f.exitosos.toLocaleString("es-CO")}
        </span>
      ),
    },
    {
      key: "omitidos",
      encabezado: "Omitidos",
      className: "text-right",
      celda: (f) => f.omitidos.toLocaleString("es-CO"),
    },
    {
      key: "fallidos",
      encabezado: "Fallidos",
      className: "text-right",
      celda: (f) =>
        f.fallidos > 0 ? (
          <span className="text-destructive">{f.fallidos.toLocaleString("es-CO")}</span>
        ) : (
          "0"
        ),
    },
    {
      key: "estado",
      encabezado: "Estado",
      celda: (f) => <EstadoBadge estado={f.estado} />,
    },
    {
      key: "accion",
      encabezado: "",
      className: "w-[80px]",
      celda: (f) => (
        <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
          <Link href={`/importaciones/${f.id}`}>
            Ver <ChevronRight className="size-4" aria-hidden />
          </Link>
        </Button>
      ),
    },
  ];

  const columnasAcuerdos: ColumnaTabla<FilaAcuerdos>[] = [
    {
      key: "archivo",
      encabezado: "Archivo",
      celda: (f) => (
        <span className="font-mono text-xs">{f.nombreArchivo}</span>
      ),
    },
    {
      key: "usuario",
      encabezado: "Usuario",
      celda: (f) => f.usuarioNombre ?? "—",
    },
    {
      key: "fecha",
      encabezado: "Fecha",
      celda: (f) =>
        f.creadoEn.toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    },
    {
      key: "total",
      encabezado: "Total",
      className: "text-right",
      celda: (f) => f.totalRegistros.toLocaleString("es-CO"),
    },
    {
      key: "importados",
      encabezado: "Importados",
      className: "text-right",
      celda: (f) => (
        <span className="text-green-700 dark:text-green-400">
          {f.importados.toLocaleString("es-CO")}
        </span>
      ),
    },
    {
      key: "omitidos",
      encabezado: "Omitidos",
      className: "text-right",
      celda: (f) => f.omitidos.toLocaleString("es-CO"),
    },
    {
      key: "fallidos",
      encabezado: "Fallidos",
      className: "text-right",
      celda: (f) =>
        f.fallidos > 0 ? (
          <span className="text-destructive">{f.fallidos.toLocaleString("es-CO")}</span>
        ) : (
          "0"
        ),
    },
    {
      key: "estado",
      encabezado: "Estado",
      celda: (f) => <EstadoBadge estado={f.estado} />,
    },
    {
      key: "accion",
      encabezado: "",
      className: "w-[80px]",
      celda: (f) => (
        <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
          <Link href={`/importaciones/acuerdos/${f.id}`}>
            Ver <ChevronRight className="size-4" aria-hidden />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Importaciones
          </h1>
        </div>
        <Button asChild>
          <Link href="/procesos/importar">
            <Upload className="size-4 mr-2" aria-hidden />
            Importar
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importaciones de procesos</CardTitle>
          <CardDescription>
            Historial de importaciones masivas de procesos (cartera)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columnas={columnasProcesos}
            datos={listaProcesos}
            rowKey={(f) => f.id}
            sinDatos={{
              icon: Upload,
              message: "No hay importaciones de procesos.",
              action: { href: "/procesos/importar", label: "Importar →" },
            }}
          />
          <Paginacion
            currentPage={currentPage}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            buildPageUrl={(p) =>
              buildUrl({ page: p, pageAcuerdos: currentPageAcuerdos, perPage: pageSize })
            }
            formAction="/importaciones"
            selectorSearchParams={{ page: String(currentPage), pageAcuerdos: String(currentPageAcuerdos) }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" aria-hidden />
            Importaciones de acuerdos de pago
          </CardTitle>
          <CardDescription>
            Historial de importaciones masivas de acuerdos de pago
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columnas={columnasAcuerdos}
            datos={listaAcuerdos}
            rowKey={(f) => f.id}
            sinDatos={{
              icon: FileText,
              message: "No hay importaciones de acuerdos de pago.",
              action: { href: "/procesos/importar", label: "Importar acuerdos →" },
            }}
          />
          <Paginacion
            currentPage={currentPageAcuerdos}
            totalPages={totalPagesAcuerdos}
            total={totalAcuerdos}
            pageSize={pageSize}
            buildPageUrl={(p) =>
              buildUrl({ page: currentPage, pageAcuerdos: p, perPage: pageSize })
            }
            formAction="/importaciones"
            selectorSearchParams={{ page: String(currentPage), pageAcuerdos: String(currentPageAcuerdos) }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
