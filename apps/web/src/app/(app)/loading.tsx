export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-neutral-400">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-border-muted border-t-primary" />
        <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          Cargando…
        </span>
      </div>
    </div>
  );
}
