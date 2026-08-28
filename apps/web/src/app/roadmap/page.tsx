import type { Metadata } from 'next';
import { MarketingHeader } from '@/components/marketing-header';
import { SiteFooter } from '@/components/site-footer';
import { StatCard } from '@/components/ui/stat-card';
import { TECH_RADAR } from '@/data/tech-radar';
import { RoadmapDiagram } from './roadmap-diagram';
import { RoadmapChart } from './roadmap-chart';
import { RoadmapTable } from './roadmap-table';

export const metadata: Metadata = {
  title: 'Roadmap · UltraIa',
  description:
    'Mapa visual del proyecto UltraIa: tecnologías, cómo se conectan y las mejoras posibles.',
};

// * Página /roadmap (pública).
// * Muestra el inventario tecnologico del proyecto como diagrama, grafico y tabla.
export default function RoadmapPage() {
  const categories = new Set(TECH_RADAR.map((t) => t.category)).size;
  const activeCount = TECH_RADAR.filter((t) => t.status === 'active').length;

  return (
    <div className="min-h-screen bg-canvas">
      <MarketingHeader user={null} />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          tech inventory
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          Roadmap <span className="gradient-neo-text">técnico</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Mapa visual del proyecto UltraIa: tecnologías, cómo se conectan entre sí, su peso aproximado en el
          código y las mejoras posibles. Los datos vienen de{' '}
          <code className="rounded border border-border-subtle bg-panel-header px-1.5 py-0.5 font-mono text-xs text-neutral-300">
            src/data/tech-radar.ts
          </code>{' '}
          y de la tabla{' '}
          <code className="rounded border border-border-subtle bg-panel-header px-1.5 py-0.5 font-mono text-xs text-neutral-300">
            TechRadar
          </code>{' '}
          en la base de datos.
        </p>

        <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
          <div className="card-glow-hover rounded-lg">
            <StatCard label="tecnologías" value={TECH_RADAR.length} />
          </div>
          <div className="card-glow-hover rounded-lg">
            <StatCard label="categorías" value={categories} />
          </div>
          <div className="card-glow-hover rounded-lg">
            <StatCard label="en activo" value={activeCount} />
          </div>
        </div>

        <h2 className="mt-12 font-display text-xl font-semibold tracking-tight">
          <span className="mr-2 font-mono text-[11px] font-normal uppercase tracking-widest text-neutral-500">
            01
          </span>
          Diagrama de conexiones
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Cada caja es una tecnología; las líneas violeta son sus dependencias.
        </p>
        <div className="mt-3">
          <RoadmapDiagram />
        </div>

        <h2 className="mt-12 font-display text-xl font-semibold tracking-tight">
          <span className="mr-2 font-mono text-[11px] font-normal uppercase tracking-widest text-neutral-500">
            02
          </span>
          Uso e importancia
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Barra violeta = porcentaje de uso aproximado. Barra verde = importancia (1–5).
        </p>
        <div className="glass-panel mt-3 rounded-xl p-5">
          <RoadmapChart />
        </div>

        <h2 className="mt-12 font-display text-xl font-semibold tracking-tight">
          <span className="mr-2 font-mono text-[11px] font-normal uppercase tracking-widest text-neutral-500">
            03
          </span>
          Mejoras posibles
        </h2>
        <p className="mt-1 text-xs text-neutral-500">Backlog de cambios y evolución del proyecto.</p>
        <div className="mt-3">
          <RoadmapTable />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}