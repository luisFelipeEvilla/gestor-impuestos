"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const restablecido = searchParams.get("restablecido") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        setError("Email o contraseña incorrectos.");
        setIsLoading(false);
        return;
      }
      if (result?.ok) {
        // Redirección completa para que el navegador envíe la cookie de sesión
        // en la siguiente petición; router.push + refresh no siempre la incluye.
        window.location.href = callbackUrl;
        return;
      }
      setError("Error al iniciar sesión. Intenta de nuevo.");
    } catch {
      setError("Error al iniciar sesión. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          aria-invalid={!!error}
          aria-describedby={error ? "login-error" : undefined}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <Link
            href="/recuperar-password"
            className="text-muted-foreground text-xs underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          aria-invalid={!!error}
        />
      </div>
      {restablecido && (
        <p className="text-sm text-green-600 dark:text-green-400" role="status">
          Contraseña actualizada. Ya puedes iniciar sesión.
        </p>
      )}
      {error && (
        <p
          id="login-error"
          className="text-destructive text-sm"
          role="alert"
        >
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {isLoading ? "Iniciando sesión…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
