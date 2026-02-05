"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardRefreshButton(): JSX.Element {
  const router = useRouter();

  const handleRefresh = (): void => {
    router.refresh();
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      aria-label="Refrescar información del dashboard"
      className="gap-2"
    >
      <RefreshCw className="size-4" aria-hidden />
      Refrescar
    </Button>
  );
}
