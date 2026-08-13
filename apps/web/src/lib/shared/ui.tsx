// //! REFERENCE COPY (no se usa en la app). Original real: apps/web/src/app/(app)/studio/studio-client.tsx
// * Copia comentada de las piezas visuales que se repiten en los 6 paneles del Studio.
'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// * Clases de texto compartidas por todos los inputs (cajas de texto).
export const inputCls =
  'w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500';

// * Clases compartidas por todos los botones primarios (violeta).
export const btnCls =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50';

// * Mapa de "glow" (color de fondo tenue) por tipo de panel. Solo estetica.
export const GLOW: Record<string, string> = {
  'glow-web': 'shadow-[0_0_40px_-12px_rgba(56,189,248,0.5)]',
  'glow-video': 'shadow-[0_0_40px_-12px_rgba(167,139,250,0.5)]',
  'glow-audio': 'shadow-[0_0_40px_-12px_rgba(244,114,182,0.5)]',
  'glow-code': 'shadow-[0_0_40px_-12px_rgba(52,211,153,0.5)]',
};

// * `StudioCard` es la "tarjeta" con titulo + icono que envuelve cada herramienta del Studio.
// * `icon` recibe un icono de lucide-react; `glow` recibe una clave de GLOW (opcional).
export function StudioCard({
  title,
  icon: Icon,
  glow,
  children,
}: {
  title: string;
  icon: LucideIcon;
  glow?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 ${glow ?? ''}`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-neutral-300">{title}</h2>
      </div>
      {children}
    </section>
  );
}
