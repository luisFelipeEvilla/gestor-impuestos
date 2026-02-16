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
import { useSidebar } from "@/components/sidebar-provider";

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
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathname: string;
  collapsed: boolean;
}) {
  const isActive =
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center rounded-xl text-sm font-medium transition-all duration-200",
        collapsed ? "justify-center px-0 py-2.5 size-11" : "gap-3 px-3 py-2.5",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
      aria-current={isActive ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
    >
      <Icon
        className={cn("size-5 shrink-0", isActive ? "opacity-95" : "opacity-80")}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function SidebarNav({ isAdmin }: SidebarNavProps) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();

  return (
    <nav
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-1 py-1",
        collapsed ? "px-2" : "px-3"
      )}
      aria-label="Menú"
    >
      <div className="flex flex-col gap-1">
        {navItemsMain.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            pathname={pathname}
            collapsed={collapsed}
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
                collapsed={collapsed}
              />
            ))}
            <NavLink
              href={navItemConfig.href}
              label={navItemConfig.label}
              icon={navItemConfig.icon}
              pathname={pathname}
              collapsed={collapsed}
            />
          </div>
        </>
      )}
    </nav>
  );
}
