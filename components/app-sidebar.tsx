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
      <div className="flex h-24 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold text-sidebar-foreground transition-colors hover:text-primary"
          aria-label="Ir al inicio"
        >
          <Image
            src="/logo_rr.png"
            alt=""
            width={120}
            height={120}
            className="h-32 w-auto object-contain"
          />
          {/* <span className="truncate text-[15px]"></span> */}
        </Link>
      </div>
      {/* Navegación: crece y hace scroll si hay muchos ítems */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SidebarNav isAdmin={isAdmin} />
      </div>
    </aside>
  );
}
