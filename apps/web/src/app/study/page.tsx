import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@ultraia/core';
import { optionalUser } from '@/lib/server/context';
import { parseJsonArray } from '@ultraia/core';
import { EmptyState } from '@/components/ui/empty-state';
import { BookOpen, Layers, Clock, Search, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Aprender - UltraIa',
  description: 'Sistema de aprendizaje asistido con IA - Cursos, métodos de estudio y progreso',
};

const CATEGORY_LABEL: Record<string, string> = {
  fundamentals: 'Fundamentos',
  typescript: 'TypeScript',
  react: 'React',
  backend: 'Backend',
  database: 'Base de datos',
  ai: 'IA',
  agents: 'Agentes',
  omag: 'OMAG',
  multimedia: 'Multimedia',
  autopub: 'AutoPub',
  cerebro: 'Cerebro',
  runtime: 'Runtime',
  devops: 'DevOps',
  markdown: 'Markdown',
  conclusion: 'Conclusión',
};

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border-subtle bg-panel-header px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
      {CATEGORY_LABEL[category] ?? category}
    </span>
  );
}

export default async function StudyPage() {
  const user = await optionalUser().catch(() => null);

  const courses = await prisma.learningCourse.findMany({
    where: { isPublished: true },
    orderBy: [{ order: 'asc' }, { title: 'asc' }],
    include: {
      modules: {
        where: { isPublished: true },
        orderBy: { order: 'asc' },
        include: {
          _count: { select: { lessons: true } },
        },
      },
    },
  });

  // progress map if logged in
  let progressMap = new Map<string, number>();
  if (user) {
    const progresses = await prisma.learningProgress.findMany({
      where: { userId: user.id },
      select: { courseId: true, completedLessons: true },
    });
    for (const p of progresses) {
      const arr = parseJsonArray(p.completedLessons);
      // need total lessons per course
      const course = courses.find((c) => c.id === p.courseId);
      const total = course ? course.modules.reduce((a, m) => a + (m as any)._count.lessons, 0) : 0;
      const pct = total ? Math.round((arr.length / total) * 100) : 0;
      progressMap.set(p.courseId, pct);
    }
  }

  const totalLessons = courses.reduce((a, c) => a + c.modules.reduce((b, m) => b + (m as any)._count.lessons, 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="neo-aura">
        <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          learning system · prisma · sm-2
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Sistema de <span className="gradient-neo-text">Aprendizaje</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">
          Cursos verificados con repetición espaciada (SM-2), lectura bilingüe es/ar y búsqueda
          offline-first. Datos reales de Prisma (no stubs).
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono text-neutral-500">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-panel px-3 py-1">
            <BookOpen className="h-3.5 w-3.5" /> {courses.length} cursos
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-panel px-3 py-1">
            <Layers className="h-3.5 w-3.5" /> {totalLessons} lecciones
          </span>
          <Link
            href="/study/search"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary transition-colors hover:bg-primary/20"
          >
            <Search className="h-3.5 w-3.5" /> Buscar
          </Link>
        </div>
      </div>

      {/* Grid */}
      {courses.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<BookOpen className="h-8 w-8" />}
            title="Aún no hay cursos publicados"
            description="El Learning System está migrado (16 modelos Prisma) pero sin contenido. Un ADMIN puede crear cursos vía POST /api/learning/courses o seed."
            action={
              <Link
                href="/api/learning/courses"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Ver API <Sparkles className="h-4 w-4" />
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, i) => {
            const pct = progressMap.get(course.id) ?? 0;
            const lessonCount = course.modules.reduce((a, m) => a + (m as any)._count.lessons, 0);
            return (
              <Link
                key={course.id}
                href={`/study/course/${course.id}`}
                className="group glass-panel card-glow-hover flex flex-col rounded-xl p-5 [animation:var(--animate-chat-enter)]"
                style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-xl">
                    {course.icon ?? '📚'}
                  </span>
                  <CategoryBadge category={course.category} />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold leading-tight text-white group-hover:text-primary">
                  {course.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-neutral-400">
                  {course.description ?? 'Curso del sistema de aprendizaje UltraIa.'}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <Layers className="h-3 w-3" /> {course.modules.length} módulos
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> {lessonCount} lecciones
                  </span>
                </div>
                <div className="mt-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-header">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 font-mono text-[11px] text-neutral-500">
                    {user ? `${pct}% completado` : 'Inicia sesión para guardar progreso'}
                  </p>
                </div>
                <span className="mt-3 inline-flex items-center gap-1 font-mono text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Ver curso <Clock className="h-3 w-3" />
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Quick links */}
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        <Link href="/study/search" className="glass-panel rounded-xl p-4 hover:bg-panel-hover">
          <h4 className="font-display text-sm font-semibold text-white">Búsqueda</h4>
          <p className="mt-1 text-xs text-neutral-500">Offline-first en corpus verificado (SearchIndex)</p>
        </Link>
        <Link href="/study/flashcards/overview" className="glass-panel rounded-xl p-4 hover:bg-panel-hover">
          <h4 className="font-display text-sm font-semibold text-white">Flashcards SRS</h4>
          <p className="mt-1 text-xs text-neutral-500">SM-2 con easeFactor e intervalos</p>
        </Link>
        <Link href="/study/read/overview" className="glass-panel rounded-xl p-4 hover:bg-panel-hover">
          <h4 className="font-display text-sm font-semibold text-white">Lectura bilingüe</h4>
          <p className="mt-1 text-xs text-neutral-500">Panel dividido es/ar con presets</p>
        </Link>
      </div>
    </div>
  );
}
