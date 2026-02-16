"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Building2,
  Briefcase,
  Receipt,
  FileText,
  Users,
  Building,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItemsMain: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/procesos", label: "Procesos", icon: FolderOpen },
  { href: "/contribuyentes", label: "Contribuyentes", icon: Building2 },
  { href: "/clientes", label: "Clientes", icon: Briefcase },
  { href: "/impuestos", label: "Impuestos", icon: Receipt },
  { href: "/actas", label: "Actas", icon: FileText },
];

const navItemsAdmin: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { href: "/cargos", label: "Cargos", icon: ClipboardList },
  { href: "/usuarios", label: "Usuarios", icon: Users },
];

const navItemConfig = {
  href: "/empresa",
  label: "Configuración",
  icon: Building,
};

type SidebarNavProps = {
  isAdmin: boolean;
};

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathname: string;
}) {
  const isActive =
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        className={cn("size-5 shrink-0", isActive ? "opacity-95" : "opacity-80")}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function SidebarNav({ isAdmin }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 px-3 py-1" aria-label="Menú">
      <div className="flex flex-col gap-1">
        {navItemsMain.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            pathname={pathname}
          />
        ))}
      </div>
      {isAdmin && (
        <>
          <div className="min-h-0 flex-1" aria-hidden />
          <div className="flex shrink-0 flex-col gap-1 border-t border-sidebar-border pt-3">
            {navItemsAdmin.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                pathname={pathname}
              />
            ))}
            <NavLink
              href={navItemConfig.href}
              label={navItemConfig.label}
              icon={navItemConfig.icon}
              pathname={pathname}
            />
          </div>
        </>
      )}
    </nav>
  );
}
