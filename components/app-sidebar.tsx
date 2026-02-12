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
        "fixed inset-y-0 left-0 z-10 flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_12px_-2px_rgba(0,0,0,0.4)]",
        className
      )}
      aria-label="Navegación principal"
    >
      {/* Cabecera: logo visible en claro y oscuro */}
      <div className="flex min-h-20 shrink-0 items-center border-b border-sidebar-border px-4 py-3">
        <Link
          href="/"
          className="flex items-center justify-center w-full font-semibold text-sidebar-foreground transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-xl p-2 -m-2"
          aria-label="Ir al inicio"
        >
          <span className="flex items-center justify-center rounded-lg px-1 py-1.5">
            <Image
              src="/logo_rr.png"
              alt="RR Consultorías"
              width={128}
              height={52}
              className="h-24 w-auto object-contain max-w-[200px]"
            />
          </span>
        </Link>
      </div>
      {/* Navegación: crece y hace scroll si hay muchos ítems */}
      <div className="sidebar-nav-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2">
        <SidebarNav isAdmin={isAdmin} />
      </div>
    </aside>
  );
}
