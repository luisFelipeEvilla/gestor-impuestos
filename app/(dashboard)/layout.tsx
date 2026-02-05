import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { Navbar } from "@/components/dashboard/navbar";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  return (
    <div className="min-h-screen">
      <AppSidebar session={session} />
      {/* Margen para no quedar debajo del sidebar fijo (w-60 = 15rem) */}
      <div className="flex min-h-screen flex-col border-l border-border/40 pl-60">
        <Navbar session={session} />
        <main className="bg-background flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
