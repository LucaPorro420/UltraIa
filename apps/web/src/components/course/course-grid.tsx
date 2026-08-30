'use client';

import { useState } from 'react';
import type { Framework, FrameworkCategory } from '@/course/types';
import { CATEGORY_LABELS } from '@/course/types';
import { CourseCard } from './course-card';

const FILTERS: (FrameworkCategory | 'all')[] = [
  'all',
  'frontend',
  'fullstack',
  'backend',
  'language',
];

export function CourseGrid({ frameworks }: { frameworks: Framework[] }) {
  const [cat, setCat] = useState<FrameworkCategory | 'all'>('all');
  const filtered =
    cat === 'all' ? frameworks : frameworks.filter((f) => f.category === cat);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((c) => {
          const active = c === cat;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors duration-150 ${
                active
                  ? 'border-primary/40 bg-primary/15 text-white'
                  : 'border-border-subtle text-neutral-400 hover:text-white'
              }`}
            >
              {c === 'all' ? 'Todos' : CATEGORY_LABELS[c]}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((f) => (
          <CourseCard key={f.id} framework={f} />
        ))}
      </div>
    </div>
  );
}
