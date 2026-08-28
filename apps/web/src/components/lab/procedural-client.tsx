'use client';

import { useState } from 'react';

// Mapa de paletas del lab (nombres provenientes de PALETTE_NAMES en @ultraia/core).
const PALETTE_COLORS: Record<string, string[]> = {
  obsidian: ['#08080a', '#111115', '#8b5cf6'],
  neoViolet: ['#8b5cf6', '#a78bfa', '#1f1f2a'],
  fire: ['#ff6b35', '#f7931e', '#2a0a00'],
  ice: ['#7dd3fc', '#bae6fd', '#0a1a2a'],
  mono: ['#ffffff', '#9ca3af', '#111115'],
};

export function ProceduralClient({ palettes }: { palettes: string[] }) {
  const [active, setActive] = useState(palettes[0] ?? 'obsidian');
  const colors = PALETTE_COLORS[active] ?? PALETTE_COLORS.obsidian;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="rounded-2xl border border-border-subtle bg-panel p-6">
        <h1 className="font-display text-2xl font-bold text-white">Lab · Procedural</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Generación determinista de geometría, imágenes y video desde matemática. Selecciona una
          paleta para previsualizar la identidad del lab.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {palettes.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setActive(p)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors duration-200 ${
                active === p
                  ? 'border-primary bg-primary/15 text-white'
                  : 'border-border-subtle text-neutral-300 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div
          className="mt-5 h-40 rounded-xl border border-border-subtle"
          style={{ background: `linear-gradient(135deg, ${colors.join(', ')})` }}
          aria-label={`Vista previa de paleta ${active}`}
        />

        <p className="mt-4 text-xs text-neutral-500">
          El motor completo (superfórmula de Gielis, encoder PNG puro, video procedural) se conecta
          aquí próximamente.
        </p>
      </div>
    </div>
  );
}
