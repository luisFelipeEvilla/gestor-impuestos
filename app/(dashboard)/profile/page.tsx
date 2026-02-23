import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { usuarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
          Datos de tu cuenta (página renderizada en el servidor).
        </p>
      </div>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Datos personales</CardTitle>
            <CardDescription>
              Nombre y correo de la cuenta. Para editar y cambiar contraseña usa
              la versión con formularios en cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="text-muted-foreground text-sm">Nombre</p>
              <p className="font-medium">{user.nombre ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Correo</p>
              <p className="font-medium">{user.email ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
