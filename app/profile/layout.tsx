import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SidebarProvider } from "@/components/sidebar-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function ProfileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  return (
    <SidebarProvider>
      <div className="min-h-screen">
        <AppSidebar session={session} />
        <DashboardShell session={session}>{children}</DashboardShell>
      </div>
    </SidebarProvider>
  );
}
