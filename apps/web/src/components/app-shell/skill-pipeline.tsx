'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ListOrdered, Hammer, FlaskConical, ScanSearch, Rocket, Scissors, Check } from 'lucide-react';

export type SkillStatus = 'enabled' | 'disabled';

export interface PipelineStep {
  key: 'plan' | 'build' | 'test' | 'review' | 'ship' | 'simplify';
  label: string;
  icon: typeof ListOrdered;
  hint: string;
}

const STEPS: PipelineStep[] = [
  { key: 'plan', label: 'Plan', icon: ListOrdered, hint: 'Design & scope' },
  { key: 'build', label: 'Build', icon: Hammer, hint: 'Implement' },
  { key: 'test', label: 'Test', icon: FlaskConical, hint: 'QA & evals' },
  { key: 'review', label: 'Review', icon: ScanSearch, hint: 'Critique' },
  { key: 'ship', label: 'Ship', icon: Rocket, hint: 'Release' },
  { key: 'simplify', label: 'Simplify', icon: Scissors, hint: 'Refactor' },
];

const STATUS_COLORS: Record<SkillStatus, string> = {
  enabled: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  disabled: 'text-neutral-500 border-border-subtle bg-input-active',
};

export function SkillPipeline({
  statuses,
  compact = false,
}: {
  statuses?: Partial<Record<PipelineStep['key'], SkillStatus>>;
  compact?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.pipeline-step',
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.06 },
        );
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className={compact ? '' : 'grid gap-2 sm:grid-cols-2 lg:grid-cols-3'}>
      {STEPS.map((step) => {
        const status = statuses?.[step.key] ?? 'enabled';
        const Icon = step.icon;
        return (
          <div
            key={step.key}
            className="pipeline-step flex items-center gap-3 rounded-lg border border-border-subtle bg-panel p-3 transition-colors duration-150"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${STATUS_COLORS[status]} transition-colors duration-150`}
            >
              {status === 'enabled' ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-display text-sm font-semibold text-neutral-100">
                {step.label}
              </p>
              <p className="truncate font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                {step.hint}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}