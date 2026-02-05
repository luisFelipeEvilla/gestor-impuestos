import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { contribuyentes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EliminarContribuyenteButton } from "./botones-contribuyente";

type Props = { params: Promise<{ id: string }> };

export default async function DetalleContribuyentePage({ params }: Props) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const [contribuyente] = await db
    .select()
    .from(contribuyentes)
    .where(eq(contribuyentes.id, id));
  if (!contribuyente) notFound();

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
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
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{contribuyente.nombreRazonSocial}</CardTitle>
          <CardDescription>
            {contribuyente.tipoDocumento === "nit" ? "NIT" : "Cédula"}: {contribuyente.nit}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Tipo de documento</dt>
              <dd className="font-medium capitalize">
                {contribuyente.tipoDocumento === "nit" ? "NIT" : "Cédula"}
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
    </div>
  );
}
