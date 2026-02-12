"use client";

import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import {
  Bell,
  ChevronDown,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavbarProps = {
  session: Session | null;
};

function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Navbar({ session }: NavbarProps) {
  return (
    <header
      className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-end gap-2 border-b border-border/80 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      role="banner"
    >
      <div className="flex flex-1 items-center justify-end gap-1">
        <ThemeToggle />
        {/* Botón de notificaciones (funcionalidad posterior) */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl size-9"
          aria-label="Notificaciones"
        >
          <Bell className="size-5" />
        </Button>

        {/* Dropdown de usuario / sesión */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-accent/80"
              aria-label="Menú de cuenta"
            >
              <span
                className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary transition-all duration-200 group-hover:bg-primary/20"
                aria-hidden
              >
                {session?.user ? getInitials(session.user.name) : "?"}
              </span>
              <span className="hidden max-w-[120px] truncate text-left text-sm font-medium sm:inline">
                {session?.user?.name ?? "Usuario"}
              </span>
              <ChevronDown className="size-4 shrink-0 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium leading-none">
                  {session?.user?.name ?? "Usuario"}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {session?.user?.email ?? ""}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <a href="#" className="cursor-pointer">
                  <User className="size-4" />
                  Mi cuenta
                </a>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                signOut({ callbackUrl: "/login" });
              }}
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
