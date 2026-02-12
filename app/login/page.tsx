import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Iniciar sesión | Gestor de Impuestos",
  description: "Inicia sesión en la plataforma de gestión de procesos de cobro.",
};

function LoginFormFallback() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        <div className="h-10 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        <div className="h-10 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="h-10 rounded-md bg-muted animate-pulse mt-2" />
    </div>
  );
}

export default function LoginPage() {
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
              Gestor de Impuestos
            </h1>
            <p className="text-muted-foreground text-sm">
              Ingresa tus credenciales para continuar
            </p>
          </div>
        </div>
        <Card className="border-border/80 shadow-xl shadow-primary/10 rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1.5 pb-2">
            <CardTitle className="text-lg">Acceso</CardTitle>
            <CardDescription>
              Email y contraseña de la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Suspense fallback={<LoginFormFallback />}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
