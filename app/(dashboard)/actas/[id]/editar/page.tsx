import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { actasReunion, actasIntegrantes, actasReunionClientes, usuarios, documentosActa, clientes, compromisosActa } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { actualizarActa } from "@/lib/actions/actas";
import { obtenerMiembrosPorClientes } from "@/lib/actions/clientes-miembros";
import { ActaForm } from "@/components/actas/acta-form";
import { Button } from "@/components/ui/button";
import { SubirDocumentoActaForm, ListaDocumentosActa } from "@/components/actas/documentos-acta";

type Props = { params: Promise<{ id: string }> };

function formatDateForInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "" : (d as Date).toISOString().slice(0, 10);
}

export default async function EditarActaPage({ params }: Props) {
  const { id } = await params;
  const actaId = parseInt(id, 10);
  if (Number.isNaN(actaId)) notFound();

  const session = await getSession();
  const [acta, integrantes, documentos, compromisosRows, usuariosList, clientesList] = await Promise.all([
    db
      .select()
      .from(actasReunion)
      .where(eq(actasReunion.id, actaId))
      .limit(1),
    db
      .select({
        id: actasIntegrantes.id,
        nombre: actasIntegrantes.nombre,
        email: actasIntegrantes.email,
        usuarioId: actasIntegrantes.usuarioId,
        tipo: actasIntegrantes.tipo,
        cargo: actasIntegrantes.cargo,
        solicitarAprobacionCorreo: actasIntegrantes.solicitarAprobacionCorreo,
      })
      .from(actasIntegrantes)
      .where(eq(actasIntegrantes.actaId, actaId)),
    db
      .select({
        id: documentosActa.id,
        nombreOriginal: documentosActa.nombreOriginal,
        mimeType: documentosActa.mimeType,
        tamano: documentosActa.tamano,
        creadoEn: documentosActa.creadoEn,
      })
      .from(documentosActa)
      .where(eq(documentosActa.actaId, actaId)),
    db
      .select({
        id: compromisosActa.id,
        descripcion: compromisosActa.descripcion,
        fechaLimite: compromisosActa.fechaLimite,
        actaIntegranteId: compromisosActa.actaIntegranteId,
        clienteMiembroId: compromisosActa.clienteMiembroId,
      })
      .from(compromisosActa)
      .where(eq(compromisosActa.actaId, actaId)),
    db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
      })
      .from(usuarios)
      .where(eq(usuarios.activo, true)),
    db
      .select({ id: clientes.id, nombre: clientes.nombre, codigo: clientes.codigo })
      .from(clientes)
      .where(eq(clientes.activo, true))
      .orderBy(clientes.nombre),
  ]);

  const actaRow = acta[0];
  if (!actaRow || actaRow.estado !== "borrador") notFound();
  if (session?.user?.rol !== "admin" && actaRow.creadoPorId !== session?.user?.id) {
    notFound();
  }

  const actaClientes = await db
    .select({ clienteId: actasReunionClientes.clienteId })
    .from(actasReunionClientes)
    .where(eq(actasReunionClientes.actaId, actaId));
  const clientesIds = actaClientes.map((r) => r.clienteId);

  const allClienteIds = clientesList.map((c) => c.id);
  const clientesMiembrosList = await obtenerMiembrosPorClientes(allClienteIds);

  const compromisosInitial = compromisosRows.map((c) => {
    const foundIndex =
      c.actaIntegranteId != null
        ? integrantes.findIndex((i) => i.id === c.actaIntegranteId)
        : -1;
    const asignadoIndex = foundIndex >= 0 ? foundIndex : null;
    return {
      descripcion: c.descripcion,
      fechaLimite: c.fechaLimite
        ? formatDateForInput(c.fechaLimite)
        : "",
      asignadoIndex,
      asignadoClienteMiembroId: c.clienteMiembroId ?? null,
    };
  });

  const initialData = {
    id: actaRow.id,
    fecha: formatDateForInput(actaRow.fecha),
    objetivo: actaRow.objetivo,
    contenido: actaRow.contenido,
    compromisos: compromisosInitial,
    integrantes: integrantes.map((i) => ({
      nombre: i.nombre,
      email: i.email,
      usuarioId: i.usuarioId ?? undefined,
      tipo: (i.usuarioId ? "interno" : (i.tipo ?? "externo")) as "interno" | "externo",
      cargo: i.cargo ?? undefined,
      solicitarAprobacionCorreo: i.solicitarAprobacionCorreo ?? true,
    })),
    clientesIds,
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/actas/${actaId}`}>← Volver al acta</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-4xl space-y-6">
        <ActaForm
          action={actualizarActa}
          submitLabel="Guardar cambios"
          usuarios={usuariosList}
          clientes={clientesList}
          clientesMiembros={clientesMiembrosList}
          initialData={initialData}
        />
        <div className="rounded-lg border border-border p-4">
          <h3 className="font-medium mb-2">Documentos adjuntos</h3>
          <SubirDocumentoActaForm actaId={actaId} />
          <ListaDocumentosActa
            actaId={actaId}
            documentos={documentos.map((d) => ({
              id: d.id,
              nombreOriginal: d.nombreOriginal,
              mimeType: d.mimeType,
              tamano: d.tamano,
              creadoEn: d.creadoEn,
            }))}
            puedeEliminar
          />
        </div>
      </div>
    </div>
  );
}
