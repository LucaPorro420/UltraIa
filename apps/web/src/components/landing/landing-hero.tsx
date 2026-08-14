'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';

const TERMINAL_LINES = [
  { prefix: '$', text: 'ultraia design "summarize support tickets"', color: 'text-neutral-300' },
  { prefix: '›', text: 'agent-architect: drafting blueprint…', color: 'text-violet-300' },
  { prefix: '›', text: 'system prompt … 1,240 tokens', color: 'text-violet-300' },
  { prefix: '›', text: 'tools: [ticket-reader, safe-calc]', color: 'text-cyan-300' },
  { prefix: '›', text: 'rubric: accuracy .4 · clarity .3 · tone .3', color: 'text-amber-300' },
  { prefix: '✓', text: 'regression evals: 4/4 PASS', color: 'text-emerald-300' },
];

export function LandingHero({ user }: { user: { name?: string | null; email: string } | null }) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.matchMedia().add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('.hero-anim', { clearProps: 'all' });
      });
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.fromTo(
          '.hero-badge',
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.6 }
        )
          .fromTo(
            '.hero-title',
            { opacity: 0, y: 28 },
            { opacity: 1, y: 0, duration: 0.8 },
            '-=0.3'
          )
          .fromTo(
            '.hero-sub',
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6 },
            '-=0.45'
          )
          .fromTo(
            '.hero-cta',
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 },
            '-=0.35'
          )
          .fromTo(
            '.hero-mock',
            { opacity: 0, y: 48, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.9 },
            '-=0.3'
          );

        // Terminal typing: reveal lines sequentially, then blink the status dot
        const lines = gsap.utils.toArray<HTMLElement>('.term-line');
        const typeTl = gsap.timeline({ delay: 0.5, repeat: -1, repeatDelay: 2.5 });
        lines.forEach((line, i) => {
          typeTl
            .fromTo(
              line,
              { opacity: 0 },
              { opacity: 1, duration: 0.1, ease: 'none' },
              i * 0.55
            )
            .to(line, { opacity: 0.25, duration: 0.4, ease: 'none' }, i * 0.55 + 0.35);
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const mm = gsap.matchMedia();
    return () => mm.revert();
  }, []);

  return (
    <section ref={root} className="aurora-bg relative overflow-hidden">
      {/* IDE grid-dot backdrop, masked to the top area */}
      <div
        aria-hidden
        className="grid-dots pointer-events-none absolute inset-x-0 top-0 h-[560px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_35%,transparent_75%)] opacity-40"
      />

      <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-20 text-center sm:pt-28">
        <span className="hero-anim hero-badge inline-flex items-center gap-2 rounded-full border border-border-muted bg-panel px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          v0.1 · eval-gated improvements · human approval
        </span>

        <h1 className="hero-anim hero-title mx-auto mt-8 max-w-3xl font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          AI that{' '}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
            creates AI
          </span>{' '}
          — and learns from every conversation.
        </h1>

        <p className="hero-anim hero-sub mx-auto mt-6 max-w-2xl font-display text-lg text-neutral-400">
          Describe a task in plain language. UltraIa designs a purpose-built AI agent with its own
          system prompt, tools and evaluation rubric. Real feedback drives automatic improvements —
          always gated by evaluation, always approved by you.
        </p>

        <div className="hero-anim hero-cta mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={user ? '/agents/new' : '/register'}
            className="rounded-xl bg-primary px-8 py-3 font-semibold text-white shadow-[0_0_24px_-8px_var(--color-primary)] transition-all duration-200 ease-out hover:bg-violet-500 hover:shadow-[0_0_32px_-6px_var(--color-primary)]"
          >
            Create your first agent
          </Link>
          <Link
            href="#how-it-works"
            className="rounded-xl border border-border-muted bg-panel px-8 py-3 font-medium text-neutral-200 transition-colors duration-200 hover:border-neutral-600 hover:text-white"
          >
            See it work
          </Link>
        </div>

        {/* Agent console mockup (AgentTileWindow pattern, DESIGN.md §7) */}
        <div className="hero-anim hero-mock mx-auto mt-16 max-w-2xl text-left">
          <div className="rounded-xl border border-border-muted bg-panel/80 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md transition-shadow duration-300 hover:shadow-[0_0_28px_-10px_var(--color-primary)]">
            <div className="flex items-center justify-between border-b border-border-subtle bg-panel-header px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="font-mono text-xs font-semibold text-neutral-200">
                  agent-architect
                </span>
                <span className="hidden rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-violet-400 sm:inline-block">
                  design
                </span>
              </div>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-emerald-300">
                live
              </span>
            </div>
            <div className="space-y-1.5 bg-input-active p-4 font-mono text-xs leading-relaxed">
              {TERMINAL_LINES.map((l) => (
                <p key={l.text} className="term-line opacity-0">
                  <span className="mr-2 select-none text-neutral-600">{l.prefix}</span>
                  <span className={l.color}>{l.text}</span>
                </p>
              ))}
              <p className="flex items-center gap-1.5 pt-1 text-neutral-500">
                <span className="stream-caret" />
                waiting for feedback…
              </p>
            </div>
            <div className="flex items-center gap-2 border-t border-border-subtle bg-input-active px-3 py-2">
              <span className="font-mono text-[11px] text-neutral-600">prompt &gt;</span>
              <input
                readOnly
                value="improve the rubric based on yesterday's bad ratings"
                className="w-full bg-transparent font-mono text-xs text-neutral-300 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}