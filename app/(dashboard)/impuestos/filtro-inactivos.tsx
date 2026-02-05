import Link from "next/link";
import { Button } from "@/components/ui/button";

type FiltroInactivosProps = {
  verInactivos: boolean;
  query?: string;
};

export function FiltroInactivos({ verInactivos, query = "" }: FiltroInactivosProps): JSX.Element {
  const params = new URLSearchParams();
  if (!verInactivos) params.set("inactivos", "1");
  if (query.trim()) params.set("q", query.trim());
  const href = params.toString() ? `/impuestos?${params.toString()}` : "/impuestos";

  return (
    <Button variant={verInactivos ? "secondary" : "outline"} size="sm" asChild>
      <Link href={href}>{verInactivos ? "Solo activos" : "Ver inactivos"}</Link>
    </Button>
  );
}
