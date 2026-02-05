"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full justify-center gap-2 border-border/80 font-medium shadow-sm"
      onClick={handleSignOut}
      aria-label="Cerrar sesión"
    >
      <LogOut className="size-4" />
      Cerrar sesión
    </Button>
  );
}
