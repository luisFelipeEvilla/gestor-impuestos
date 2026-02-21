import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { procesos, contribuyentes, usuarios, documentosProceso } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { actualizarProceso } from "@/lib/actions/procesos";
import { ProcesoForm } from "@/components/procesos/proceso-form";
import { SubirDocumentoForm, ListaDocumentos } from "@/components/procesos/documentos-proceso";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { unstable_noStore } from "next/cache";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = { params: Promise<{ id: string }> };

export default async function EditarProcesoPage({ params }: Props) {
  unstable_noStore();
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) notFound();

  const session = await getSession();
  const [proceso] = await db.select().from(procesos).where(eq(procesos.id, id));
  if (!proceso) notFound();
  if (session?.user?.rol !== "admin") {
    if (!session?.user?.id || proceso.asignadoAId !== session.user.id) {
      notFound();
    }
  }

  const [contribuyentesList, usuariosList, documentosRows] = await Promise.all([
    db.select({ id: contribuyentes.id, nit: contribuyentes.nit, nombreRazonSocial: contribuyentes.nombreRazonSocial }).from(contribuyentes),
    db.select({ id: usuarios.id, nombre: usuarios.nombre }).from(usuarios).where(eq(usuarios.activo, true)),
    db
      .select({
        id: documentosProceso.id,
        nombreOriginal: documentosProceso.nombreOriginal,
        mimeType: documentosProceso.mimeType,
        tamano: documentosProceso.tamano,
        creadoEn: documentosProceso.creadoEn,
      })
      .from(documentosProceso)
      .where(eq(documentosProceso.procesoId, id))
      .orderBy(desc(documentosProceso.creadoEn)),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/procesos/${proceso.id}`}>← Ver proceso</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-3xl">
        <ProcesoForm
          action={actualizarProceso}
          initialData={proceso}
          submitLabel="Guardar cambios"
          contribuyentes={contribuyentesList}
          usuarios={usuariosList}
        />
      </div>

      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Documentos adjuntos</CardTitle>
          <CardDescription>
            Adjunta PDF, imágenes o documentos. Se almacenan en el sistema de archivos local. Máximo 10 MB por archivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SubirDocumentoForm procesoId={proceso.id} categoria="general" />
          <ListaDocumentos
            procesoId={proceso.id}
            documentos={documentosRows}
            puedeEliminar
          />
        </CardContent>
      </Card>
    </div>
  );
}
