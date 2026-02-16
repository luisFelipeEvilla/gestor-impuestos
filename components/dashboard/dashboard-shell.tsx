"use client";

import type { Session } from "next-auth";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/sidebar-provider";
import { Navbar } from "@/components/dashboard/navbar";

interface DashboardShellProps {
  session: Session | null;
  children: React.ReactNode;
}

export function DashboardShell({ session, children }: DashboardShellProps) {
  const { collapsed } = useSidebar();

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col border-l border-border/40 transition-[padding] duration-200 ease-in-out",
        collapsed ? "pl-16" : "pl-60"
      )}
    >
      <Navbar session={session} />
      <main className="bg-background flex-1 overflow-auto">{children}</main>
    </div>
  );
}
