'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MonitorUp, XCircle } from 'lucide-react';

interface ServiceProbe {
  nombre: string;
  url: string;
  ok: boolean | null;
  detalle: string;
}

function host(): string {
  if (typeof window === 'undefined') return '127.0.0.1';
  return window.location.hostname;
}

async function probe(url: string, timeoutMs = 2500): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    // 404 también cuenta como "servidor vivo" (algunos servicios no tienen ruta /).
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

/**
 * Hub Localhost (iter-180) — el apartado que conecta TODO al localhost:
 * prueba en vivo webhooks :8000, gen-engine :8100/health y la propia web,
 * y recuerda el comando único que levanta todo (`python start.py`).
 * Fail-soft: sin servicios levantados muestra OFFLINE, nunca rompe la página.
 */
export function LocalServices() {
  const [services, setServices] = useState<ServiceProbe[]>([
    { nombre: 'Web (esta página)', url: '/api/health', ok: null, detalle: 'probando…' },
    { nombre: 'Webhooks :8000', url: '', ok: null, detalle: 'probando…' },
    { nombre: 'Gen-Engine :8100', url: '', ok: null, detalle: 'probando…' },
  ]);

  useEffect(() => {
    let alive = true;
    const h = host();
    const targets = [
      { nombre: 'Web (esta página)', url: '/api/health' },
      { nombre: 'Webhooks :8000', url: `http://${h}:8000/` },
      { nombre: 'Gen-Engine :8100', url: `http://${h}:8100/health` },
    ];
    (async () => {
      const results = await Promise.all(
        targets.map(async (t) => ({
          ...t,
          ok: await probe(t.url),
          detalle: '',
        })),
      );
      if (!alive) return;
      setServices(
        results.map((r) => ({
          ...r,
          detalle: r.ok ? 'ONLINE' : 'OFFLINE — levanta con python start.py',
        })),
      );
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section aria-label="Localhost" className="glass-panel rounded-xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <MonitorUp className="h-5 w-5 text-emerald-300" />
        <h2 className="text-lg font-semibold">Localhost — todo conectado aquí</h2>
      </div>
      <p className="mb-4 text-sm text-neutral-400">
        Un comando levanta web + webhooks + gen-engine:{' '}
        <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs text-emerald-200">
          python start.py
        </code>{' '}
        (diagnóstico: <code className="font-mono text-xs">python start.py --check-connections</code>)
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {services.map((s) => (
          <div key={s.nombre} className="rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              {s.ok === null ? (
                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
              ) : s.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              {s.nombre}
            </div>
            <div className="mt-1 truncate font-mono text-xs text-neutral-500">{s.url}</div>
            <div className="mt-1 text-xs text-neutral-400">{s.detalle}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
