import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FiltroInactivos({ verInactivos }: { verInactivos: boolean }) {

  const href = verInactivos ? "/impuestos" : "/impuestos?inactivos=1";

  return (
    <Button variant={verInactivos ? "secondary" : "outline"} size="sm" asChild>
      <Link href={href}>{verInactivos ? "Solo activos" : "Ver inactivos"}</Link>
    </Button>
  );
}
