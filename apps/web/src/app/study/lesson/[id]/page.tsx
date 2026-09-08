import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@ultraia/core';
import { optionalUser } from '@/lib/server/context';
import { parseJsonArray } from '@ultraia/core';
import { ArrowLeft, Clock, Tag, BookOpen, CheckCircle2, Languages } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const lesson = await prisma.learningLesson.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { title: true, content: true },
  });
  if (!lesson) return { title: 'Lección no encontrada' };
  return { title: `${lesson.title} - UltraIa`, description: lesson.content.slice(0, 160) };
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const lesson = await prisma.learningLesson.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      module: { include: { course: true } },
      resources: { orderBy: { order: 'asc' } },
    },
  });

  if (!lesson) notFound();

  const tags = parseJsonArray(lesson.tags);
  const prereqs = parseJsonArray(lesson.prerequisites);
  const bilingual = lesson.bilingualContent as any as { es?: string; ar?: string; en?: string } | null;
  const quiz = lesson.quiz as any as { question?: string; options?: string[]; correct?: number; explanation?: string } | null;

  const user = await optionalUser().catch(() => null);
  let progress: any = null;
  if (user) {
    progress = await prisma.learningLessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
      select: { status: true, score: true, bookmarked: true },
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link href={`/study/course/${lesson.module.course.id}`} className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> {lesson.module.course.title} / {lesson.module.title}
      </Link>

      <div className="mt-6 glass-panel rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
              {lesson.module.course.category} · {lesson.difficulty} · {lesson.durationMin} min
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-white">{lesson.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{lesson.durationMin} min</span>
              {tags.length > 0 && <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" />{tags.join(', ')}</span>}
              {progress && <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="h-3 w-3" />{progress.status}</span>}
            </p>
          </div>
          <Link href={`/study/read/${lesson.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-panel-header px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white">
            <Languages className="h-3.5 w-3.5" /> Lectura bilingüe
          </Link>
        </div>

        {prereqs.length > 0 && (
          <p className="mt-3 text-xs text-amber-400/80">Prerrequisitos: {prereqs.join(', ')}</p>
        )}
      </div>

      {/* Content */}
      <article className="prose prose-invert mt-6 max-w-none rounded-xl border border-border-subtle bg-panel p-6 text-sm leading-relaxed prose-headings:font-display prose-headings:text-white prose-a:text-primary">
        <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
        {lesson.contentMarkdown && (
          <details className="mt-6 rounded-lg border border-border-subtle bg-panel-header p-3">
            <summary className="cursor-pointer text-xs font-mono text-neutral-400">Ver Markdown fuente</summary>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-neutral-300">{lesson.contentMarkdown}</pre>
          </details>
        )}
      </article>

      {/* Bilingual preview */}
      {bilingual?.es && (
        <div className="mt-6 rounded-xl border border-border-subtle bg-panel p-4">
          <h3 className="font-display text-sm font-semibold text-white">Contenido bilingüe</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-panel-header p-3">
              <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">ES</p>
              <p className="mt-1 text-sm text-neutral-300 line-clamp-6">{bilingual.es}</p>
            </div>
            <div className="rounded-lg bg-panel-header p-3">
              <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">AR / EN</p>
              <p className="mt-1 text-sm text-neutral-300 line-clamp-6" dir={bilingual.ar ? 'rtl' : 'ltr'}>
                {bilingual.ar ?? bilingual.en ?? '—'}
              </p>
            </div>
          </div>
          <Link href={`/study/read/${lesson.id}`} className="mt-3 inline-flex text-xs text-primary hover:underline">Abrir lector bilingüe →</Link>
        </div>
      )}

      {/* Quiz */}
      {quiz?.question && (
        <div className="quiz-container mt-6">
          <p className="quiz-question">{quiz.question}</p>
          <div className="quiz-options">
            {(quiz.options ?? []).map((opt, idx) => (
              <div key={idx} className="quiz-option">
                <span className="quiz-option-letter">{String.fromCharCode(65 + idx)}</span>
                <span>{opt}</span>
              </div>
            ))}
          </div>
          {quiz.explanation && <p className="mt-3 text-xs text-neutral-500">Pista: {quiz.explanation}</p>}
        </div>
      )}

      {lesson.exercise && (
        <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="font-display text-sm font-semibold text-amber-300">Ejercicio</h3>
          <p className="mt-1 text-sm text-neutral-300">{lesson.exercise}</p>
        </div>
      )}

      {/* Resources */}
      {lesson.resources.length > 0 && (
        <div className="mt-6 glass-panel rounded-xl p-5">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-white">
            <BookOpen className="h-4 w-4" /> Recursos ({lesson.resources.length})
          </h3>
          <ul className="mt-3 space-y-2">
            {lesson.resources.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-border-subtle bg-panel-header px-3 py-2 text-sm">
                <span>
                  <span className="font-mono text-xs text-neutral-500">[{r.type}]</span> {r.title}
                </span>
                <span className="flex items-center gap-2">
                  {r.isOffline && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">offline</span>}
                  {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Abrir</a>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
