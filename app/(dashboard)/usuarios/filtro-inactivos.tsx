import Link from "next/link";
import { Button } from "@/components/ui/button";

type FiltroInactivosUsuariosProps = {
  verInactivos: boolean;
  query?: string;
};

export function FiltroInactivosUsuarios({
  verInactivos,
  query = "",
}: FiltroInactivosUsuariosProps): JSX.Element {
  const params = new URLSearchParams();
  if (!verInactivos) params.set("inactivos", "1");
  if (query.trim()) params.set("q", query.trim());
  const href = params.toString() ? `/usuarios?${params.toString()}` : "/usuarios";

  return (
    <Button variant={verInactivos ? "secondary" : "outline"} size="sm" asChild>
      <Link href={href}>{verInactivos ? "Solo activos" : "Ver inactivos"}</Link>
    </Button>
  );
}
