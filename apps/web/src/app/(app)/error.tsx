'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app] route error:', error);
  }, [error]);

  const isDb =
    /does not exist|no such table|prisma|database|datasource|connect/i.test(error.message);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="font-display text-lg font-semibold text-neutral-100">Algo salió mal</h2>
      <p className="max-w-md text-sm text-neutral-400">{error.message || 'Error inesperado.'}</p>
      {isDb && (
        <p className="max-w-md rounded-lg border border-border-subtle bg-panel px-3 py-2 font-mono text-[11px] text-neutral-400">
          Parece un problema de base de datos. Ejecuta{' '}
          <code className="text-primary">npm run db:migrate</code> y recarga.
        </p>
      )}
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
