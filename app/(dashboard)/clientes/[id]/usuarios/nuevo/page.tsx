import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { clientes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NuevoUsuarioClienteForm } from "@/components/clientes/nuevo-usuario-cliente-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export default async function NuevoUsuarioClientePage({ params }: Props) {
  const { id: idStr } = await params;
  const clienteId = parseInt(idStr, 10);
  if (Number.isNaN(clienteId)) notFound();

  const [cliente] = await db.select({ id: clientes.id, nombre: clientes.nombre })
    .from(clientes)
    .where(eq(clientes.id, clienteId));
  if (!cliente) notFound();

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/clientes/${clienteId}`}>← {cliente.nombre}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nuevo usuario cliente</CardTitle>
          <CardDescription>
            Crea un acceso de solo lectura y firma para {cliente.nombre}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NuevoUsuarioClienteForm clienteId={clienteId} />
        </CardContent>
      </Card>
    </div>
  );
}
