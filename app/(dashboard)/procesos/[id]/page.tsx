import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { procesos, impuestos, contribuyentes, usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EliminarProcesoButton } from "./botones-proceso";

type Props = { params: Promise<{ id: string }> };

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CO");
}

export default async function DetalleProcesoPage({ params }: Props) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [row] = await db
    .select({
      id: procesos.id,
      vigencia: procesos.vigencia,
      periodo: procesos.periodo,
      montoCop: procesos.montoCop,
      estadoActual: procesos.estadoActual,
      fechaLimite: procesos.fechaLimite,
      creadoEn: procesos.creadoEn,
      impuestoNombre: impuestos.nombre,
      impuestoCodigo: impuestos.codigo,
      contribuyenteNit: contribuyentes.nit,
      contribuyenteNombre: contribuyentes.nombreRazonSocial,
      asignadoNombre: usuarios.nombre,
    })
    .from(procesos)
    .innerJoin(impuestos, eq(procesos.impuestoId, impuestos.id))
    .innerJoin(contribuyentes, eq(procesos.contribuyenteId, contribuyentes.id))
    .leftJoin(usuarios, eq(procesos.asignadoAId, usuarios.id))
    .where(eq(procesos.id, id));

  if (!row) notFound();

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/procesos">← Procesos</Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/procesos/${row.id}/editar`}>Editar</Link>
          </Button>
          <EliminarProcesoButton id={row.id} />
        </div>
      </div>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>
            Proceso #{row.id} · {row.impuestoCodigo} – {row.contribuyenteNombre}
          </CardTitle>
          <CardDescription>
            Vigencia {row.vigencia}
            {row.periodo ? ` · Período ${row.periodo}` : ""}
            {" · "}
            Estado: <span className="capitalize">{row.estadoActual?.replace(/_/g, " ")}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Impuesto</dt>
              <dd className="font-medium">
                {row.impuestoCodigo} – {row.impuestoNombre}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Contribuyente</dt>
              <dd className="font-medium">
                {row.contribuyenteNit} – {row.contribuyenteNombre}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vigencia / Período</dt>
              <dd className="font-medium">
                {row.vigencia}
                {row.periodo ? ` · ${row.periodo}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Monto (COP)</dt>
              <dd className="font-medium">{Number(row.montoCop).toLocaleString("es-CO")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Estado</dt>
              <dd className="capitalize">{row.estadoActual?.replace(/_/g, " ")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Asignado a</dt>
              <dd>{row.asignadoNombre ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fecha límite</dt>
              <dd>{formatDate(row.fechaLimite)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Creado</dt>
              <dd>{formatDate(row.creadoEn)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
