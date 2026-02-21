import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-8 animate-fade-in" role="status" aria-label="Cargando dashboard">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-1 w-12 rounded-full bg-muted animate-pulse" aria-hidden />
            <div className="h-9 w-32 rounded bg-muted animate-pulse" aria-hidden />
          </div>
          <div className="h-4 w-72 rounded bg-muted animate-pulse pl-14" aria-hidden />
        </div>
        <div className="flex items-end gap-3">
          <div className="h-9 w-[120px] rounded-md bg-muted animate-pulse" aria-hidden />
          <div className="h-9 w-24 rounded-md bg-muted animate-pulse" aria-hidden />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="border-l-4 border-l-muted overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 rounded bg-muted animate-pulse" aria-hidden />
              <div className="size-5 rounded bg-muted animate-pulse" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 rounded bg-muted animate-pulse" aria-hidden />
              <div className="mt-2 h-3 w-28 rounded bg-muted animate-pulse" aria-hidden />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-5 w-40 rounded bg-muted animate-pulse" aria-hidden />
            <div className="h-4 w-56 rounded bg-muted animate-pulse" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full rounded bg-muted animate-pulse" aria-hidden />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-5 w-44 rounded bg-muted animate-pulse" aria-hidden />
            <div className="h-4 w-52 rounded bg-muted animate-pulse" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full rounded bg-muted animate-pulse" aria-hidden />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <div className="h-5 w-52 rounded bg-muted animate-pulse" aria-hidden />
            <div className="h-4 w-64 rounded bg-muted animate-pulse" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full rounded bg-muted animate-pulse" aria-hidden />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-5 w-40 rounded bg-muted animate-pulse" aria-hidden />
            <div className="h-4 w-72 rounded bg-muted animate-pulse" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg bg-muted animate-pulse"
                  aria-hidden
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-5 w-36 rounded bg-muted animate-pulse" aria-hidden />
            <div className="h-4 w-32 rounded bg-muted animate-pulse" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg bg-muted animate-pulse"
                  aria-hidden
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <span className="sr-only">Cargando dashboard…</span>
    </div>
  );
}
