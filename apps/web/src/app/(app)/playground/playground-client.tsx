'use client';

import { useState } from 'react';
import { GeometryClient } from './geometry-client';
import { DiagramsClient } from './diagrams-client';

type Tab = 'geometry' | 'diagrams' | 'procedural' | 'codevfx' | 'travel';

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'geometry', label: 'Geometry', desc: 'Superformula de Gielis 2D/3D' },
  { id: 'diagrams', label: 'Diagrams', desc: 'Diagramas editoriales SVG' },
  { id: 'procedural', label: 'Procedural', desc: 'Ruido, fractales, animaciones' },
  { id: 'codevfx', label: 'CodeVFX', desc: 'Efectos visuales 100% codigo' },
  { id: 'travel', label: 'Travel', desc: 'Planes de video de viaje' },
];

export function PlaygroundClient() {
  const [tab, setTab] = useState<Tab>('geometry');

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#e7e7ee]">Capability Playground</h1>
        <p className="mt-1 text-sm text-[#9a9aae]">
          Explora y prueba las capabilities procedurales de UltraIa -- geometria, diagramas,
          efectos visuales y mas. Todo determinista, keyless, sin costo.
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              tab === t.id
                ? 'bg-[#8b5cf6] text-white'
                : 'border border-[#26263a] bg-[#0c0c10] text-[#c7c7d6] hover:border-[#3a3a52]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab description */}
      <p className="mb-4 text-xs text-[#6b6b80]">
        {TABS.find((t) => t.id === tab)?.desc}
      </p>

      {/* Tab content */}
      <div className="rounded-xl border border-[#1f1f2a] bg-[#111115] p-4">
        {tab === 'geometry' && <GeometryClient />}
        {tab === 'diagrams' && <DiagramsClient />}
        {tab === 'procedural' && (
          <div className="text-sm text-[#9a9aae]">
            <p>Procedural playground ya existe en{' '}
              <a href="/lab/procedural" className="text-[#8b5cf6] hover:underline">/lab/procedural</a>
            </p>
          </div>
        )}
        {tab === 'codevfx' && (
          <div className="text-sm text-[#9a9aae]">
            <p>CodeVFX: efectos visuales generativos (fire, ice, lightning, meteor, beam, ground).</p>
            <p className="mt-2">Próximamente: editor interactivo de efectos.</p>
          </div>
        )}
        {tab === 'travel' && (
          <div className="text-sm text-[#9a9aae]">
            <p>Travel planner: genera planes de video de viaje con prompts de imagen 9:16.</p>
            <p className="mt-2">Próximamente: editor interactivo de planes de viaje.</p>
          </div>
        )}
      </div>
    </div>
  );
}
