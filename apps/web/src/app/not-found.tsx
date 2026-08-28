import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-canvas px-6 text-center">
      <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-primary">
        Ultra<span className="gradient-neo-text">Ia</span>
      </span>
      <h1 className="font-display text-3xl font-bold text-neutral-100">404</h1>
      <p className="max-w-sm text-sm text-neutral-400">
        Esta página no existe o fue movida. Vuelve al inicio o entra a tu espacio.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-lg border border-border-subtle bg-panel px-4 py-2 text-sm text-neutral-200 transition-colors duration-150 hover:bg-panel-hover"
        >
          Inicio
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary/85"
        >
          Mi espacio
        </Link>
      </div>
    </div>
  );
}
