import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXT_AUTH_SECRET,
  });

  const isLoginPage = pathname === "/login";
  const isAuthApi = pathname.startsWith("/api/auth");
  const isHealthApi = pathname === "/api/health";
  const isRecuperarPassword =
    pathname === "/recuperar-password" || pathname.startsWith("/recuperar-password/");
  const isAprobarParticipante = pathname === "/actas/aprobar-participante";
  const isDescargaDocumentoActa = pathname === "/api/actas/documentos/descargar";

  if (
    isLoginPage ||
    isAuthApi ||
    isHealthApi ||
    isRecuperarPassword ||
    isAprobarParticipante ||
    isDescargaDocumentoActa
  ) {
    if (token && (isLoginPage || isRecuperarPassword)) {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const rol = (token as { rol?: "admin" | "empleado" }).rol;
  if (
    (pathname.startsWith("/usuarios") || pathname.startsWith("/cargos")) &&
    rol !== "admin"
  ) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/actas/:path*",
    "/procesos/:path*",
    "/clientes/:path*",
    "/contribuyentes/:path*",
    "/impuestos/:path*",
    "/usuarios/:path*",
    "/cargos/:path*",
    "/perfil/:path*",
    "/empresa/:path*",
    "/login",
    "/recuperar-password/:path*",
    "/api/:path*",
  ],
};
