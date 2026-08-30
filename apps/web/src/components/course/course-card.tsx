'use client';

import Link from 'next/link';
import type { Framework } from '@/course/types';
import { useCourseProgress } from './progress-provider';

export function CourseCard({ framework }: { framework: Framework }) {
  const { countDone } = useCourseProgress();
  const keys = framework.modules.flatMap((m) => m.lessons.map((l) => `${framework.id}/${l.id}`));
  const done = countDone(keys);
  const pct = keys.length ? Math.round((done / keys.length) * 100) : 0;

  return (
    <Link href={`/course/${framework.id}`} className="group block h-full">
      <div className="glass-panel card-glow-hover flex h-full flex-col rounded-xl p-5">
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-lg text-2xl"
            style={{ backgroundColor: `${framework.color}1a`, color: framework.color }}
          >
            {framework.icon}
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight text-white">
              {framework.name}
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              {framework.category}
            </span>
          </div>
        </div>

        <p className="mt-3 flex-1 text-sm text-neutral-400">{framework.tagline}</p>

        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-header">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: framework.color }}
            />
          </div>
          <p className="mt-2 font-mono text-xs text-neutral-500">
            {done}/{keys.length} lecciones · {pct}%
          </p>
        </div>
      </div>
    </Link>
  );
}
