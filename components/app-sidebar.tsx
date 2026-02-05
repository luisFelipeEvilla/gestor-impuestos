import Link from "next/link";
import Image from "next/image";
import type { Session } from "next-auth";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/auth/sign-out-button";
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
        "flex w-60 flex-col border-r border-sidebar-border bg-sidebar",
        className
      )}
      aria-label="Navegación principal"
    >
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold text-sidebar-foreground transition-colors hover:text-primary"
          aria-label="Ir al inicio"
        >
          <Image
            src="/logo_rr.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-auto object-contain"
          />
          <span className="truncate text-[15px]">Gestor Impuestos</span>
        </Link>
      </div>
      <SidebarNav isAdmin={isAdmin} />
      <div className="border-sidebar-border border-t p-3">
        {session?.user && (
          <p
            className="text-muted-foreground mb-2 truncate px-2 text-xs font-medium"
            title={session.user.email}
          >
            {session.user.name}
          </p>
        )}
        <SignOutButton />
      </div>
    </aside>
  );
}
