"use client";

import { useState, useEffect } from "react";
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
  ChevronDown,
  Settings,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar-provider";

const navItemsMain: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/procesos", label: "Comparendos", icon: FolderOpen },
  { href: "/importaciones", label: "Importaciones", icon: Upload },
  { href: "/contribuyentes", label: "Contribuyentes", icon: Building2 },
  { href: "/clientes", label: "Clientes", icon: Briefcase },
  { href: "/impuestos", label: "Tipo de procesos", icon: Receipt },
];

const actasMenuItems: { href: string; label: string }[] = [
  { href: "/actas", label: "Actas" },
  { href: "/actas/compromisos", label: "Compromisos" },
];

const configMenuItems: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { href: "/cargos", label: "Cargos", icon: ClipboardList },
  { href: "/usuarios", label: "Usuarios", icon: Users },
  { href: "/empresa", label: "Empresa", icon: Building },
];

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

function NavActasExpandable({
  pathname,
  collapsed,
}: {
  pathname: string;
  collapsed: boolean;
}) {
  const isInActas = pathname === "/actas" || pathname.startsWith("/actas/");
  const [open, setOpen] = useState(isInActas);

  useEffect(() => {
    if (isInActas) setOpen(true);
  }, [isInActas]);

  if (collapsed) {
    return (
      <Link
        href="/actas"
        title="Actas"
        className={cn(
          "flex items-center justify-center rounded-xl py-2.5 size-11 text-sm font-medium transition-all duration-200",
          isInActas
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
        aria-current={isInActas ? "page" : undefined}
        aria-label="Actas"
      >
        <FileText className={cn("size-5 shrink-0", isInActas ? "opacity-95" : "opacity-80")} />
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center rounded-xl text-sm font-medium transition-all duration-200 gap-3 px-3 py-2.5 text-left",
          isInActas
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
        aria-expanded={open}
        aria-label="Actas"
      >
        <FileText className={cn("size-5 shrink-0", isInActas ? "opacity-95" : "opacity-80")} />
        <span className="truncate flex-1">Actas</span>
        <ChevronDown
          className={cn("size-4 shrink-0 opacity-70 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 pl-4 ml-3 border-l border-sidebar-border">
          {actasMenuItems.map((item) => {
            const isActive =
              item.href === "/actas"
                ? pathname === "/actas"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg py-2 px-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavConfigExpandable({
  pathname,
  collapsed,
}: {
  pathname: string;
  collapsed: boolean;
}) {
  const isInConfig = configMenuItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  const [open, setOpen] = useState(isInConfig);

  useEffect(() => {
    if (isInConfig) setOpen(true);
  }, [isInConfig]);

  if (collapsed) {
    return (
      <Link
        href="/empresa"
        title="Configuración"
        className={cn(
          "flex items-center justify-center rounded-xl py-2.5 size-11 text-sm font-medium transition-all duration-200",
          isInConfig
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
        aria-current={isInConfig ? "page" : undefined}
        aria-label="Configuración"
      >
        <Settings className={cn("size-5 shrink-0", isInConfig ? "opacity-95" : "opacity-80")} />
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center rounded-xl text-sm font-medium transition-all duration-200 gap-3 px-3 py-2.5 text-left",
          isInConfig
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
        aria-expanded={open}
        aria-label="Configuración"
      >
        <Settings className={cn("size-5 shrink-0", isInConfig ? "opacity-95" : "opacity-80")} />
        <span className="truncate flex-1">Configuración</span>
        <ChevronDown
          className={cn("size-4 shrink-0 opacity-70 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 pl-4 ml-3 border-l border-sidebar-border">
          {configMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg py-2 px-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="size-4 shrink-0 opacity-80" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SidebarNav({
  isAdmin,
  configPosition = "inline",
}: SidebarNavProps & { configPosition?: "inline" | "bottom" }) {
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
        <NavActasExpandable pathname={pathname} collapsed={collapsed} />
      </div>
      {isAdmin && configPosition === "inline" && (
        <>
          <div className="min-h-0 flex-1" aria-hidden />
          <div className="sticky bottom-0 flex shrink-0 flex-col gap-1 border-t border-sidebar-border bg-sidebar pt-3">
            <NavConfigExpandable pathname={pathname} collapsed={collapsed} />
          </div>
        </>
      )}
    </nav>
  );
}

/** Sección de Configuración para colocar al fondo del sidebar (viewport). Usar fuera del área con scroll. */
export function SidebarNavConfig({ isAdmin }: SidebarNavProps) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  if (!isAdmin) return null;
  return (
    <div className="flex shrink-0 flex-col gap-1 border-t border-sidebar-border bg-sidebar py-2 pt-3">
      <nav
        className={cn(
          "flex flex-col gap-1",
          collapsed ? "px-2" : "px-3"
        )}
        aria-label="Configuración"
      >
        <NavConfigExpandable pathname={pathname} collapsed={collapsed} />
      </nav>
    </div>
  );
}
