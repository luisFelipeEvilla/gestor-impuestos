"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Building2,
  Receipt,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/procesos", label: "Procesos", icon: FolderOpen },
  { href: "/contribuyentes", label: "Contribuyentes", icon: Building2 },
  { href: "/impuestos", label: "Impuestos", icon: Receipt },
  { href: "/usuarios", label: "Usuarios", icon: Users, adminOnly: true },
];

type SidebarNavProps = {
  isAdmin: boolean;
};

export function SidebarNav({ isAdmin }: SidebarNavProps) {
  const pathname = usePathname();
  const items = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Menú">
      {items.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon
              className={cn(
                "size-5 shrink-0",
                isActive ? "opacity-95" : "opacity-80"
              )}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
