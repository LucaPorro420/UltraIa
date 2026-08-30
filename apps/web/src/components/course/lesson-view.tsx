'use client';

import Link from 'next/link';
import type { Lesson } from '@/course/types';
import { useCourseProgress } from './progress-provider';
import { CodeBlock } from './code-block';

interface LessonNav {
  id: string;
  title: string;
}

export function LessonView({
  frameworkId,
  frameworkName,
  moduleTitle,
  lesson,
  prev,
  next,
}: {
  frameworkId: string;
  frameworkName: string;
  moduleTitle: string;
  lesson: Lesson;
  prev?: LessonNav;
  next?: LessonNav;
}) {
  const { isDone, toggle } = useCourseProgress();
  const key = `${frameworkId}/${lesson.id}`;
  const done = isDone(key);
  const paragraphs = lesson.content.split('\n\n');

  return (
    <article>
      <Link
        href={`/course/${frameworkId}`}
        className="font-mono text-xs text-neutral-500 transition-colors duration-150 hover:text-white"
      >
        ← {frameworkName}
      </Link>

      <header className="mt-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          {moduleTitle}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white">
          {lesson.title}
        </h1>
        <p className="mt-2 text-sm text-neutral-400">{lesson.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {lesson.topics.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border-subtle px-2 py-0.5 font-mono text-[10px] text-neutral-400"
            >
              {t}
            </span>
          ))}
          <span className="font-mono text-[10px] text-neutral-600">{lesson.durationMin} min</span>
        </div>
      </header>

      <div className="mt-8 max-w-2xl">
        {paragraphs.map((p, i) => (
          <p key={i} className="mb-4 leading-relaxed text-neutral-300">
            {p}
          </p>
        ))}

        {lesson.examples?.map((ex, i) => (
          <CodeBlock key={i} example={ex} />
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between gap-4 border-t border-border-subtle pt-6">
        {prev ? (
          <Link
            href={`/course/${frameworkId}/${prev.id}`}
            className="text-sm text-neutral-400 transition-colors duration-150 hover:text-white"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={() => toggle(key)}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 ${
            done
              ? 'bg-panel-hover text-neutral-300 hover:text-white'
              : 'bg-primary text-white shadow-[0_0_18px_-8px_var(--color-primary)] hover:bg-primary/85'
          }`}
        >
          {done ? '✓ Completada' : 'Marcar completada'}
        </button>

        {next ? (
          <Link
            href={`/course/${frameworkId}/${next.id}`}
            className="text-right text-sm text-neutral-400 transition-colors duration-150 hover:text-white"
          >
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </article>
  );
}
