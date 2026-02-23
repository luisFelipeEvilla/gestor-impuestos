"use client";

import Link from "next/link";
import Image from "next/image";
import type { Session } from "next-auth";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/sidebar-provider";
import { SidebarNav, SidebarNavConfig } from "@/components/sidebar-nav";

interface AppSidebarProps {
  className?: string;
  session: Session | null;
}

export function AppSidebar({ className, session }: AppSidebarProps) {
  const isAdmin = session?.user?.rol === "admin";
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-10 flex h-screen flex-col border-r border-sidebar-border bg-sidebar shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)] transition-[width] duration-200 ease-in-out dark:shadow-[2px_0_12px_-2px_rgba(0,0,0,0.4)]",
        collapsed ? "w-16" : "w-60",
        className
      )}
      aria-label="Navegación principal"
    >
      {/* Cabecera: logo y botón de colapsar */}
      <div
        className={cn(
          "flex min-h-20 shrink-0 items-center border-b border-sidebar-border py-3 transition-[padding] duration-200",
          collapsed ? "justify-center px-0" : "px-4"
        )}
      >
        <div className="flex w-full items-center justify-center gap-1">
          <Link
            href="/"
            className={cn(
              "flex items-center justify-center font-semibold text-sidebar-foreground transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-xl p-2 -m-2",
              collapsed ? "shrink-0" : "flex-1"
            )}
            aria-label="Ir al inicio"
          >
            <span
              className={cn(
                "flex items-center justify-center overflow-hidden rounded-lg",
                collapsed ? "h-9 w-9" : "px-1 py-1.5"
              )}
            >
              <Image
                src="/logo_rr.png"
                alt="RR Consultorías"
                width={collapsed ? 36 : 102.4}
                height={collapsed ? 36 : 38.4}
                className={cn(
                  "object-contain",
                  collapsed ? "h-9 w-9" : "h-16 w-auto max-w-[160px]"
                )}
              />
            </span>
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={toggle}
              aria-label="Colapsar menú"
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}
        </div>
      </div>
      {collapsed && (
        <div className="flex justify-center border-b border-sidebar-border px-0 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={toggle}
            aria-label="Expandir menú"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
      {/* Navegación (scroll) */}
      <div className="sidebar-nav-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2">
        <SidebarNav isAdmin={isAdmin} configPosition="bottom" />
      </div>
      {/* Configuración fija al fondo del sidebar */}
      <SidebarNavConfig isAdmin={isAdmin} />
    </aside>
  );
}
