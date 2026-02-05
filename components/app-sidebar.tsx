import Link from "next/link";
import type { Session } from "next-auth";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/auth/sign-out-button";

const navItems: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/procesos", label: "Procesos" },
  { href: "/contribuyentes", label: "Contribuyentes" },
  { href: "/impuestos", label: "Impuestos" },
  { href: "/usuarios", label: "Usuarios", adminOnly: true },
];

type AppSidebarProps = {
  className?: string;
  session: Session | null;
};

export function AppSidebar({ className, session }: AppSidebarProps) {
  const isAdmin = session?.user?.rol === "admin";
  const items = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={cn(
        "flex w-56 flex-col border-r border-sidebar-border bg-sidebar",
        className
      )}
      aria-label="Navegación principal"
    >
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link href="/" className="font-semibold text-sidebar-foreground">
          Gestor Impuestos
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Menú">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-3 py-2 text-sm font-medium"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-sidebar-border border-t p-2">
        {session?.user && (
          <p className="text-muted-foreground mb-1 truncate px-2 text-xs" title={session.user.email}>
            {session.user.name}
          </p>
        )}
        <SignOutButton />
      </div>
    </aside>
  );
}
