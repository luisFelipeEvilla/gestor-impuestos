export default function DashboardLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6">
      <div
        className="size-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  );
}
