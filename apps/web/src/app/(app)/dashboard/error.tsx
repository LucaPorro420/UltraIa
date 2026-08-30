'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard] Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="rounded-xl border border-border-subtle bg-panel p-8 text-center">
        <h2 className="font-display text-lg font-bold text-neutral-100">
          Algo salió mal en el Dashboard
        </h2>
        <p className="mt-2 text-sm text-neutral-400">
          {error.message || 'Error inesperado al cargar el dashboard.'}
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-[10px] text-neutral-600">
            Digest: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary/85"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
