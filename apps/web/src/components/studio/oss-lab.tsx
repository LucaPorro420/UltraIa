'use client';

import { ExternalLink, GitBranch, PackageOpen } from 'lucide-react';
import type { OssEntry } from '@ultraia/core';

const STATUS_STYLE: Record<string, string> = {
  ported: 'border-primary/50 bg-primary/10 text-violet-200',
  wired: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  available: 'border-border-muted bg-input-active text-neutral-400',
};

/**
 * Apartado "Open Source Lab" del Studio (loop-104): catálogo de proyectos
 * vendoreados en vendor/ con su estado de integración y las acciones que
 * habilitan. El catálogo llega como prop desde el server component para no
 * arrastrar el bundle de core al cliente.
 */
export function OssLab({ catalog }: { catalog: readonly OssEntry[] }) {
  return (
    <div className="space-y-4">
      <div className="glass-panel flex flex-wrap items-center gap-3 rounded-xl p-3 text-xs text-neutral-400">
        <PackageOpen className="h-4 w-4 shrink-0 text-primary" />
        <p>
          Proyectos open source vendoreados en <code className="font-mono text-neutral-300">vendor/</code> que alimentan el
          Studio: los <span className="text-violet-200">portados</span> ya viven como capabilities propias; los{' '}
          <span className="text-emerald-200">integrados</span> están expuestos en UI/tools; los{' '}
          <span className="text-neutral-300">disponibles</span> tienen su integración definida y pendiente.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {catalog.map((entry, i) => (
          <article
            key={entry.id}
            style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
            className="card-glow-hover flex flex-col rounded-xl border border-border-subtle bg-panel p-4 [animation:var(--animate-chat-enter)]"
          >
            <header className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-semibold text-white">{entry.name}</h3>
                <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-neutral-500">
                  <GitBranch className="h-3 w-3" /> {entry.vendorPath} · {entry.license}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                  STATUS_STYLE[entry.status] ?? STATUS_STYLE.available
                }`}
              >
                {entry.status}
              </span>
            </header>

            <p className="mt-2.5 flex-1 text-xs leading-relaxed text-neutral-400">{entry.aporta}</p>

            <ul className="mt-3 space-y-1">
              {entry.acciones.map((accion) => (
                <li key={accion} className="flex items-start gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-300">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {accion}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
        <ExternalLink className="h-3 w-3" /> Las integraciones disponibles se activan ciclo a ciclo vía PIVR (fila 104+).
      </p>
    </div>
  );
}
