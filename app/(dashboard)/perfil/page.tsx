import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { listarCargosEmpresa } from "@/lib/actions/cargos-empresa";
import { PerfilForm } from "@/components/perfil/perfil-form";
import { unstable_noStore } from "next/cache";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function PerfilPage() {
  unstable_noStore();
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId) || userId < 1) redirect("/login");

  const [userRow, cargos] = await Promise.all([
    db.select().from(usuarios).where(eq(usuarios.id, userId)),
    listarCargosEmpresa(),
  ]);
  const user = userRow[0];
  if (!user) redirect("/login");

  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Mi perfil</h1>
        <PerfilForm initialData={user} cargos={cargos} />
      </div>
    </div>
  );
}
