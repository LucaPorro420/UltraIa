'use client';

import Link from 'next/link';
import type { Framework } from '@/course/types';
import { LEVEL_LABELS } from '@/course/types';
import { useCourseProgress } from './progress-provider';

export function FrameworkView({ framework }: { framework: Framework }) {
  const { isDone, toggle, countDone } = useCourseProgress();
  const totalKeys = framework.modules.flatMap((m) =>
    m.lessons.map((l) => `${framework.id}/${l.id}`),
  );
  const totalDone = countDone(totalKeys);
  const pct = totalKeys.length
    ? Math.round((totalDone / totalKeys.length) * 100)
    : 0;

  return (
    <div>
      <Link
        href="/course"
        className="font-mono text-xs text-neutral-500 transition-colors duration-150 hover:text-white"
      >
        ← Volver al roadmap
      </Link>

      <header className="mt-4 flex items-center gap-4">
        <span
          className="grid h-14 w-14 place-items-center rounded-xl text-3xl"
          style={{ backgroundColor: `${framework.color}1a`, color: framework.color }}
        >
          {framework.icon}
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            {framework.name}
          </h1>
          <p className="text-sm text-neutral-400">{framework.description}</p>
        </div>
      </header>

      <div className="mt-4 rounded-lg border border-border-subtle bg-panel-header/60 p-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-panel">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: framework.color }}
          />
        </div>
        <p className="mt-1 font-mono text-xs text-neutral-500">
          {totalDone}/{totalKeys.length} completadas · {pct}%
        </p>
      </div>

      <div className="mt-10 space-y-10">
        {framework.modules.map((m) => (
          <section key={m.id}>
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="font-display text-xl font-semibold tracking-tight text-white">
                {m.title}
              </h2>
              <span className="rounded-full bg-panel-header px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                {LEVEL_LABELS[m.level]}
              </span>
            </div>
            <ul className="space-y-2">
              {m.lessons.map((l) => {
                const key = `${framework.id}/${l.id}`;
                const done = isDone(key);
                return (
                  <li
                    key={l.id}
                    className="flex items-center gap-3 rounded-lg border border-border-subtle bg-panel/40 p-3 transition-colors duration-150 hover:bg-panel-hover"
                  >
                    <button
                      type="button"
                      aria-pressed={done}
                      aria-label={done ? 'Marcar como no completada' : 'Marcar como completada'}
                      onClick={() => toggle(key)}
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-150 ${
                        done
                          ? 'border-transparent text-white'
                          : 'border-neutral-600 text-transparent hover:border-neutral-400'
                      }`}
                      style={done ? { backgroundColor: framework.color } : undefined}
                    >
                      ✓
                    </button>
                    <Link
                      href={`/course/${framework.id}/${l.id}`}
                      className="flex-1"
                    >
                      <p className="font-medium text-neutral-100 transition-colors duration-150 hover:text-white">
                        {l.title}
                      </p>
                      <p className="text-xs text-neutral-500">{l.summary}</p>
                    </Link>
                    <span className="shrink-0 font-mono text-[10px] text-neutral-600">
                      {l.durationMin}m
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
