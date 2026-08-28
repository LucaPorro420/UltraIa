'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global] fatal error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: '#08080a',
          color: '#e5e5e5',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 480, padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Error crítico</h2>
          <p style={{ fontSize: 13, color: '#a3a3a3', marginTop: 8 }}>
            {error.message || 'Fallo inesperado de la aplicación.'}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              borderRadius: 8,
              background: '#8b5cf6',
              color: '#fff',
              border: 0,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
