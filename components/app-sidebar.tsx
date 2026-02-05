import Link from "next/link";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/procesos", label: "Procesos" },
  { href: "/contribuyentes", label: "Contribuyentes" },
  { href: "/impuestos", label: "Impuestos" },
] as const;

export function AppSidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn("flex w-56 flex-col border-r border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50", className)}
      aria-label="Navegación principal"
    >
      <div className="flex h-14 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
        <Link href="/" className="font-semibold text-zinc-900 dark:text-zinc-50">
          Gestor Impuestos
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Menú">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
