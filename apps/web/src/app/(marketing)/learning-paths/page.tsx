import type { Metadata } from 'next';
import { learningPaths } from '@/course/data/learning-paths';
import { LearningPaths } from '@/components/course/learning-paths';

export const metadata: Metadata = {
  title: 'Caminos de Aprendizaje Gratis · UltraIa',
  description:
    '5 recursos gratuitos verificados para conseguir empleo como programador en lugar de pagar un bootcamp.',
};

export default async function LearningPathsPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <section className="neo-aura mx-auto max-w-5xl px-6 py-20">
        <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          learning paths
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          <span className="gradient-neo-text">Caminos de aprendizaje</span>{' '}
          gratuitos para conseguir empleo
        </h1>
        <p className="mt-4 max-w-2xl text-neutral-400">
          5 recursos verificados para aprender programación sin pagar un bootcamp.{' '}
          <span className="text-neutral-500">
            Solo 2 de 5 accesibles verificablemente por el muro de sesión de
            Instagram; el resto pendiente de verificar.
          </span>
        </p>

        <div className="mt-8 grid max-w-lg grid-cols-2 gap-3">
          <span className="rounded-full bg-primary/10 px-3 py-1.5 font-mono text-xs text-primary">
            {learningPaths.length} caminos verificados
          </span>
          <span className="rounded-full bg-panel-header px-3 py-1.5 font-mono text-xs text-neutral-400">
            5 total · 3 pendientes
          </span>
        </div>

        <div className="mt-12">
          <LearningPaths paths={learningPaths} />
        </div>
      </section>
    </main>
  );
}
