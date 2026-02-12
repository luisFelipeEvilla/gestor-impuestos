import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RestablecerPasswordForm } from "@/components/auth/restablecer-password-form";

export const metadata = {
  title: "Nueva contraseña | Gestor de Impuestos",
  description: "Ingresa tu nueva contraseña.",
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function RestablecerPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex w-full max-w-sm flex-col gap-10">
          <div className="flex flex-col items-center gap-5 text-center">
            <Image
              src="/logo_rr.png"
              alt="RR Consultorías"
              width={140}
              height={56}
              className="h-16 w-auto object-contain"
              priority
            />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Enlace inválido
            </h1>
            <p className="text-muted-foreground text-sm">
              Falta el token de recuperación. Solicita un nuevo enlace desde la página de recuperación de contraseña.
            </p>
          </div>
          <Link
            href="/recuperar-password"
            className="text-center text-primary underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Solicitar enlace de recuperación
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="flex w-full max-w-sm flex-col gap-10">
        <div className="flex flex-col items-center gap-5 text-center">
          <Image
            src="/logo_rr.png"
            alt="RR Consultorías"
            width={140}
            height={56}
            className="h-16 w-auto object-contain"
            priority
          />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Nueva contraseña
            </h1>
            <p className="text-muted-foreground text-sm">
              Elige una contraseña segura de al menos 6 caracteres
            </p>
          </div>
        </div>
        <Card className="border-border/80 shadow-xl shadow-primary/10 rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1.5 pb-2">
            <CardTitle className="text-lg">Contraseña</CardTitle>
            <CardDescription>
              Será la que uses para iniciar sesión a partir de ahora
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <RestablecerPasswordForm token={token} />
          </CardContent>
        </Card>
        <p className="text-center text-muted-foreground text-sm">
          <Link
            href="/login"
            className="underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
