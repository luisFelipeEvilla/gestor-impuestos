import Image from "next/image";
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

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Image
            src="/logo_rr.png"
            alt="RR Consultorías"
            width={140}
            height={56}
            className="h-14 w-auto object-contain"
            priority
          />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Gestor de Impuestos
            </h1>
            <p className="text-muted-foreground text-sm">
              Ingresa tus credenciales para continuar
            </p>
          </div>
        </div>
        <Card className="border-border/80 shadow-xl shadow-primary/10 rounded-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Acceso</CardTitle>
            <CardDescription>
              Ingresa tu email y contraseña para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
