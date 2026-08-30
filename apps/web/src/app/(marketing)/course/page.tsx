import type { Metadata } from 'next';
import { courseStats, frameworks } from '@/course';
import { CourseGrid } from '@/components/course/course-grid';
import { StatCard } from '@/components/ui/stat-card';

export const metadata: Metadata = {
  title: 'Curso de programación · UltraIa',
  description:
    'Roadmap completo de programación: 12 frameworks desde cero hasta nivel avanzado, con lecciones y ejemplos de código.',
};

export default function CoursePage() {
  const stats = courseStats();
  const categories = new Set(frameworks.map((f) => f.category)).size;

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          roadmap · programming totally
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">
          Curso de programación <span className="gradient-neo-text">desde cero</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Un recorrido completo por los 12 frameworks más usados del ecosistema web: frontend,
          backend, fullstack y lenguajes. Cada framework tiene tres niveles (básico, intermedio,
          avanzado) con lecciones prácticas y ejemplos de código. Tu progreso se guarda en este
          navegador.
        </p>

        <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
          <div className="card-glow-hover rounded-lg">
            <StatCard label="frameworks" value={stats.frameworks} />
          </div>
          <div className="card-glow-hover rounded-lg">
            <StatCard label="lecciones" value={stats.lessons} />
          </div>
          <div className="card-glow-hover rounded-lg">
            <StatCard label="categorías" value={categories} />
          </div>
        </div>

        <h2 className="mt-12 font-display text-xl font-semibold tracking-tight text-white">
          <span className="mr-2 font-mono text-[11px] font-normal uppercase tracking-widest text-neutral-500">
            roadmap
          </span>
          Elige un framework
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Filtra por categoría y empieza por donde quieras.
        </p>
        <div className="mt-4">
          <CourseGrid frameworks={frameworks} />
        </div>
      </main>
    </div>
  );
}
