import Link from "next/link";
import { db } from "@/lib/db";
import { contribuyentes } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function ContribuyentesPage() {
  const lista = await db
    .select()
    .from(contribuyentes)
    .orderBy(desc(contribuyentes.createdAt))
    .limit(50);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Contribuyentes
        </h1>
        <Link href="/contribuyentes/nuevo" className={cn(buttonVariants.base, buttonVariants.variant.default, buttonVariants.size.default)}>Nuevo contribuyente</Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Personas o entidades a las que se realiza el cobro (NIT / cédula)</CardDescription>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <p className="text-sm text-zinc-500">No hay contribuyentes registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="pb-2 pr-4 font-medium">NIT</th>
                    <th className="pb-2 pr-4 font-medium">Nombre / Razón social</th>
                    <th className="pb-2 pr-4 font-medium">Ciudad</th>
                    <th className="pb-2 pr-4 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((c) => (
                    <tr key={c.id} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="py-2 pr-4">{c.nit}</td>
                      <td className="py-2 pr-4">{c.nombreRazonSocial}</td>
                      <td className="py-2 pr-4">{c.ciudad ?? "—"}</td>
                      <td className="py-2 pr-4">
                        <Link href={`/contribuyentes/${c.id}`} className="text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50">Ver</Link>
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
