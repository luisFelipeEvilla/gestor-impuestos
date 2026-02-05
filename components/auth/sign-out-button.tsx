"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-start font-medium"
      onClick={handleSignOut}
      aria-label="Cerrar sesión"
    >
      Cerrar sesión
    </Button>
  );
}
