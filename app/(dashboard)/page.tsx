import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { procesos, impuestos, contribuyentes, usuarios } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export default async function DashboardPage() {
  const [totalProcesos, totalImpuestos, totalContribuyentes, totalUsuarios, procesosPorEstado] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(procesos),
    db.select({ count: sql<number>`count(*)::int` }).from(impuestos),
    db.select({ count: sql<number>`count(*)::int` }).from(contribuyentes),
    db.select({ count: sql<number>`count(*)::int` }).from(usuarios),
    db
      .select({ estado: procesos.estadoActual, count: sql<number>`count(*)::int` })
      .from(procesos)
      .groupBy(procesos.estadoActual),
  ]);

  const totalP = totalProcesos[0]?.count ?? 0;
  const totalI = totalImpuestos[0]?.count ?? 0;
  const totalC = totalContribuyentes[0]?.count ?? 0;
  const totalU = totalUsuarios[0]?.count ?? 0;

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Dashboard
      </h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Procesos</CardTitle>
            <CardDescription>Total de procesos de cobro</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalP}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Impuestos</CardTitle>
            <CardDescription>Catálogo de impuestos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalI}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contribuyentes</CardTitle>
            <CardDescription>Personas o entidades en gestión</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalC}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Usuarios</CardTitle>
            <CardDescription>Administradores y empleados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalU}</p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Procesos por estado</CardTitle>
          <CardDescription>Distribución actual de estados</CardDescription>
        </CardHeader>
        <CardContent>
          {procesosPorEstado.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay procesos registrados.</p>
          ) : (
            <ul className="space-y-2">
              {procesosPorEstado.map((row) => (
                <li key={row.estado} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">
                    {row.estado?.replace(/_/g, " ") ?? "—"}
                  </span>
                  <span className="font-medium">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
