import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="bg-background flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
