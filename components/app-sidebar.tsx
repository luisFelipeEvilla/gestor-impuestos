import Link from "next/link";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/procesos", label: "Procesos" },
  { href: "/contribuyentes", label: "Contribuyentes" },
  { href: "/impuestos", label: "Impuestos" },
  { href: "/usuarios", label: "Usuarios" },
] as const;

export function AppSidebar({ className }: { className?: string }) {
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
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-3 py-2 text-sm font-medium"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
