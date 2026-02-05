import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Iniciar sesión | Gestor de Impuestos",
  description: "Inicia sesión en la plataforma de gestión de procesos de cobro.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Gestor de Impuestos
          </h1>
          <p className="text-muted-foreground text-sm">
            Ingresa tus credenciales para continuar
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
