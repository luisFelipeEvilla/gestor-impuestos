import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import { PerfilForm } from "@/components/profile/perfil-form";
import { CambiarContraseñaModal } from "@/components/profile/cambiar-contrasena-modal";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId) || userId < 1) redirect("/login");

  const [user] = await db
    .select({ nombre: usuarios.nombre, email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1);

  if (!user) redirect("/login");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Mi perfil</h1>
        <p className="text-muted-foreground text-sm">
          Gestiona tu nombre, correo y contraseña.
        </p>
      </div>
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <PerfilForm initialData={{ nombre: user.nombre, email: user.email }} />
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Contraseña</h2>
          <p className="text-muted-foreground text-sm">
            Actualiza tu contraseña para mantener la cuenta segura.
          </p>
          <CambiarContraseñaModal />
        </div>
      </div>
    </div>
  );
}
