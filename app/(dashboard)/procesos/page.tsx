import Link from "next/link";
import { db } from "@/lib/db";
import { procesos } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function ProcesosPage() {
  const lista = await db
    .select()
    .from(procesos)
    .orderBy(desc(procesos.creadoEn))
    .limit(50);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Procesos de cobro
        </h1>
        <Link href="/procesos/nuevo" className={cn(buttonVariants.base, buttonVariants.variant.default, buttonVariants.size.default)}>Nuevo proceso</Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Procesos ordenados por fecha de creación (más recientes primero)</CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <p className="text-sm text-zinc-500">No hay procesos. Crea uno desde &quot;Nuevo proceso&quot;.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="pb-2 pr-4 font-medium">ID</th>
                    <th className="pb-2 pr-4 font-medium">Vigencia</th>
                    <th className="pb-2 pr-4 font-medium">Monto (COP)</th>
                    <th className="pb-2 pr-4 font-medium">Estado</th>
                    <th className="pb-2 pr-4 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="py-2 pr-4">{p.id}</td>
                      <td className="py-2 pr-4">{p.vigencia}</td>
                      <td className="py-2 pr-4">{p.montoCop}</td>
                      <td className="py-2 pr-4 capitalize">
                        {p.estadoActual?.replace(/_/g, " ")}
                      </td>
                      <td className="py-2 pr-4">
                        <Link href={`/procesos/${p.id}`} className="text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50">Ver</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
