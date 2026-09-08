import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@ultraia/core';
import { optionalUser } from '@/lib/server/context';
import { parseJsonArray, validateSlug } from '@ultraia/core';
import { ArrowLeft, BookOpen, Clock, Layers, Tag } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const course = await prisma.learningCourse.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { title: true, description: true },
  });
  if (!course) return { title: 'Curso no encontrado - UltraIa' };
  return {
    title: `${course.title} - UltraIa`,
    description: course.description ?? 'Curso del sistema de aprendizaje',
  };
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // allow both id and slug; validate slug shape loosely
  const course = await prisma.learningCourse.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      modules: {
        where: { isPublished: true },
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { order: 'asc' },
            select: { id: true, slug: true, title: true, durationMin: true, difficulty: true, tags: true, order: true },
          },
        },
      },
    },
  });

  if (!course) notFound();

  const user = await optionalUser().catch(() => null);
  let completedSet = new Set<string>();
  if (user) {
    const prog = await prisma.learningProgress.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      select: { completedLessons: true },
    });
    if (prog) parseJsonArray(prog.completedLessons).forEach((s) => completedSet.add(s));
  }

  const totalLessons = course.modules.reduce((a, m) => a + m.lessons.length, 0);
  const completedCount = [...completedSet].filter((slug) =>
    course.modules.some((m) => m.lessons.some((l) => l.slug === slug))
  ).length;
  const pct = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/study" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Volver a cursos
      </Link>

      <div className="mt-6 glass-panel rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
              {course.category} · orden {course.order}
            </p>
            <h1 className="mt-1 flex items-center gap-3 font-display text-3xl font-bold text-white">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-2xl">
                {course.icon ?? '📚'}
              </span>
              {course.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400">{course.description}</p>
          </div>
          <div className="min-w-[160px] rounded-lg border border-border-subtle bg-panel-header p-3">
            <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">Progreso</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 font-mono text-xs text-neutral-400">
              {completedCount}/{totalLessons} · {pct}%
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {course.modules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-muted bg-panel/50 p-8 text-center text-sm text-neutral-500">
            Este curso aún no tiene módulos publicados.
          </div>
        ) : (
          course.modules.map((mod) => (
            <div key={mod.id} className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-panel-header text-sm">
                  {mod.icon ?? '📦'}
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-white">{mod.title}</h2>
                  <p className="font-mono text-xs text-neutral-500">
                    {mod.slug} · {mod.lessons.length} lecciones
                  </p>
                </div>
              </div>
              {mod.description && <p className="mt-2 text-sm text-neutral-400">{mod.description}</p>}

              <div className="mt-4 space-y-2">
                {mod.lessons.map((lesson) => {
                  const tags = parseJsonArray(lesson.tags);
                  const done = completedSet.has(lesson.slug);
                  return (
                    <Link
                      key={lesson.id}
                      href={`/study/lesson/${lesson.id}`}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                        done ? 'border-primary/30 bg-primary/5' : 'border-border-subtle bg-panel-header hover:border-primary/30'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-medium ${done ? 'text-primary' : 'text-neutral-200'}`}>
                          {done ? '✓ ' : ''}
                          {lesson.title}
                        </p>
                        <p className="flex items-center gap-2 font-mono text-xs text-neutral-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {lesson.durationMin} min
                          </span>
                          <span>· {lesson.difficulty}</span>
                          {tags.length > 0 && (
                            <span className="hidden items-center gap-1 sm:inline-flex">
                              <Tag className="h-3 w-3" /> {tags.slice(0, 3).join(', ')}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-neutral-500">→</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
