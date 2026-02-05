import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  return (
    <div className="flex min-h-screen">
      <AppSidebar session={session} />
      <main className="bg-background flex-1 overflow-auto border-l border-border/40">
        {children}
      </main>
    </div>
  );
}
