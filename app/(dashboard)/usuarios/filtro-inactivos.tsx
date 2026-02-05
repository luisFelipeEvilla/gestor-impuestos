import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FiltroInactivosUsuarios({ verInactivos }: { verInactivos: boolean }) {
  const href = verInactivos ? "/usuarios" : "/usuarios?inactivos=1";

  return (
    <Button variant={verInactivos ? "secondary" : "outline"} size="sm" asChild>
      <Link href={href}>{verInactivos ? "Solo activos" : "Ver inactivos"}</Link>
    </Button>
  );
}
