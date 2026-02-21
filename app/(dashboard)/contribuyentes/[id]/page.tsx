import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getTipoDocumentoLabel } from "@/lib/constants/tipo-documento";
import { db } from "@/lib/db";
import { contribuyentes, procesos, impuestos } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
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
import { EliminarContribuyenteButton } from "./botones-contribuyente";
import { labelEstado } from "@/lib/estados-proceso";
import { unstable_noStore } from "next/cache";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = { params: Promise<{ id: string }> };

export default async function DetalleContribuyentePage({ params }: Props) {
  unstable_noStore();
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [contribuyente] = await db
    .select()
    .from(contribuyentes)
    .where(eq(contribuyentes.id, id));
  if (!contribuyente) notFound();

  const session = await getSession();
  const whereContrib = eq(procesos.contribuyenteId, id);
  const wherePermiso =
    session?.user?.rol === "admin"
      ? undefined
      : session?.user?.id
        ? eq(procesos.asignadoAId, session.user.id)
        : eq(procesos.id, -1);
  const whereCond = wherePermiso ? and(whereContrib, wherePermiso) : whereContrib;
  const procesosList = await db
    .select({
      id: procesos.id,
      vigencia: procesos.vigencia,
      montoCop: procesos.montoCop,
      estadoActual: procesos.estadoActual,
      impuestoNombre: impuestos.nombre,
    })
    .from(procesos)
    .leftJoin(impuestos, eq(procesos.impuestoId, impuestos.id))
    .where(whereCond)
    .orderBy(desc(procesos.creadoEn));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/contribuyentes">← Contribuyentes</Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/contribuyentes/${contribuyente.id}/editar`}>Editar</Link>
          </Button>
          <EliminarContribuyenteButton id={contribuyente.id} />
        </div>
      </div>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{contribuyente.nombreRazonSocial}</CardTitle>
          <CardDescription>
            {getTipoDocumentoLabel(contribuyente.tipoDocumento)}: {contribuyente.nit}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Tipo de documento</dt>
              <dd className="font-medium">
                {getTipoDocumentoLabel(contribuyente.tipoDocumento)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Número</dt>
              <dd className="font-medium">{contribuyente.nit}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Nombre / Razón social</dt>
              <dd className="font-medium">{contribuyente.nombreRazonSocial}</dd>
            </div>
            {contribuyente.telefono && (
              <div>
                <dt className="text-muted-foreground">Teléfono</dt>
                <dd>{contribuyente.telefono}</dd>
              </div>
            )}
            {contribuyente.email && (
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{contribuyente.email}</dd>
              </div>
            )}
            {contribuyente.direccion && (
              <div>
                <dt className="text-muted-foreground">Dirección</dt>
                <dd>{contribuyente.direccion}</dd>
              </div>
            )}
            {(contribuyente.ciudad || contribuyente.departamento) && (
              <div>
                <dt className="text-muted-foreground">Ciudad / Departamento</dt>
                <dd>
                  {[contribuyente.ciudad, contribuyente.departamento].filter(Boolean).join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle>Procesos de cobro</CardTitle>
          <CardDescription>
            Procesos asociados a este contribuyente
            {session?.user?.rol !== "admin" &&
              " (solo los asignados a ti)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {procesosList.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No hay procesos asociados
              {session?.user?.rol !== "admin" ? " que tengas asignados" : ""}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Impuesto</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Monto (COP)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[80px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {procesosList.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.impuestoNombre ?? "—"}</TableCell>
                    <TableCell>{p.vigencia}</TableCell>
                    <TableCell>
                      {Number(p.montoCop).toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell>{labelEstado(p.estadoActual)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                        <Link href={`/procesos/${p.id}`}>
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
