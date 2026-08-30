'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function AgentDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AgentDetail] Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="rounded-xl border border-border-subtle bg-panel p-8 text-center">
        <h2 className="font-display text-lg font-bold text-neutral-100">
          Error al cargar el agente
        </h2>
        <p className="mt-2 text-sm text-neutral-400">
          {error.message || 'No se pudo cargar la información del agente.'}
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-[10px] text-neutral-600">
            Digest: {error.digest}
          </p>
        )}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary/85"
          >
            Reintentar
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-semibold text-neutral-300 transition-colors duration-150 hover:bg-panel-hover"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
