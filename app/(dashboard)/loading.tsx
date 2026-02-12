export default function DashboardLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 p-8" role="status" aria-live="polite">
      <div
        className="size-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  );
}
