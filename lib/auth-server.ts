import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Obtiene la sesión actual. Solo para uso en Server Components o Server Actions.
 */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Comprueba que haya sesión y que el usuario tenga rol admin.
 * Retorna la sesión si es admin, o null en caso contrario.
 */
export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.rol !== "admin") return null;
  return session;
}
