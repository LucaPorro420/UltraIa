import { MarketingHeader } from '@/components/marketing-header';
import { RoadmapDiagram } from './roadmap-diagram';
import { RoadmapChart } from './roadmap-chart';
import { RoadmapTable } from './roadmap-table';

// * Pagina /roadmap (protegida, dentro del grupo (app)).
// * Muestra el inventario tecnologico del proyecto como diagrama, grafico y tabla.
export default function RoadmapPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader user={null} />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Roadmap técnico</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Mapa visual del proyecto UltraIa: tecnologías, cómo se conectan entre sí, su peso aproximado en el
          código y las mejoras posibles. Los datos vienen de{' '}
          <code className="rounded bg-neutral-800 px-1">src/data/tech-radar.ts</code> y de la tabla{' '}
          <code className="rounded bg-neutral-800 px-1">TechRadar</code> en la base de datos.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Diagrama de conexiones</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Cada caja es una tecnología; las líneas violeta son sus dependencias.
        </p>
        <div className="mt-3">
          <RoadmapDiagram />
        </div>

        <h2 className="mt-10 text-xl font-semibold">Uso e importancia</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Barra violeta = porcentaje de uso aproximado. Barra verde = importancia (1–5).
        </p>
        <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
          <RoadmapChart />
        </div>

        <h2 className="mt-10 text-xl font-semibold">Mejoras posibles</h2>
        <p className="mt-1 text-xs text-neutral-500">Backlog de cambios y evolución del proyecto.</p>
        <div className="mt-3">
          <RoadmapTable />
        </div>
      </main>
    </div>
  );
}
