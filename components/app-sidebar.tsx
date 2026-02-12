import Link from "next/link";
import Image from "next/image";
import type { Session } from "next-auth";
import { cn } from "@/lib/utils";
import { SidebarNav } from "@/components/sidebar-nav";

type AppSidebarProps = {
  className?: string;
  session: Session | null;
};

export function AppSidebar({ className, session }: AppSidebarProps) {
  const isAdmin = session?.user?.rol === "admin";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-10 flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar",
        className
      )}
      aria-label="Navegación principal"
    >
      {/* Cabecera: siempre visible arriba */}
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-3">
        <Link
          href="/"
          className="flex items-center justify-center w-full font-semibold text-sidebar-foreground transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-md"
          aria-label="Ir al inicio"
        >
          <Image
            src="/logo_rr.png"
            alt="RR Consultorías"
            width={120}
            height={48}
            className="h-12 w-auto object-contain"
          />
        </Link>
      </div>
      {/* Navegación: crece y hace scroll si hay muchos ítems */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SidebarNav isAdmin={isAdmin} />
      </div>
    </aside>
  );
}
