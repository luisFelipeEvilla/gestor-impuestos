import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SolicitarRecuperacionForm } from "@/components/auth/solicitar-recuperacion-form";

export const metadata = {
  title: "Recuperar contraseña | Gestor de Impuestos",
  description: "Solicita un enlace para restablecer tu contraseña.",
};

export default function RecuperarPasswordPage() {
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
              Recuperar contraseña
            </h1>
            <p className="text-muted-foreground text-sm">
              Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
            </p>
          </div>
        </div>
        <Card className="border-border/80 shadow-xl shadow-primary/10 rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1.5 pb-2">
            <CardTitle className="text-lg">Email</CardTitle>
            <CardDescription>
              Usa el mismo email con el que accedes a la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <SolicitarRecuperacionForm />
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
