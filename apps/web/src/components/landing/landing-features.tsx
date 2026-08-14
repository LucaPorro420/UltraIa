'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const FEATURES = [
  {
    step: '01',
    title: 'Generate',
    accent: 'text-neo-200',
    blob: 'var(--color-neo-400)',
    body: 'Tell us the job. Our Agent Architect produces a precise system prompt, model choice, tools and a measurable rubric.',
  },
  {
    step: '02',
    title: 'Run',
    accent: 'text-cyan-300',
    blob: 'var(--agent-audio)',
    body: 'Chat with your agent or call it over a scoped API key. Every exchange is stored and available for evaluation.',
  },
  {
    step: '03',
    title: 'Improve',
    accent: 'text-emerald-300',
    blob: 'var(--agent-code)',
    body: 'Negative feedback and failed evaluations feed an improvement pipeline. New versions must pass regression evals before they go live.',
  },
];

export function LandingFeatures() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.feature-card',
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
            stagger: 0.12,
            scrollTrigger: {
              trigger: '.features-grid',
              start: 'top 78%',
              once: true,
            },
          }
        );
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="how-it-works" ref={root} className="neo-aura relative mx-auto max-w-5xl px-6 pt-28">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
            the loop
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Generate → Run → Improve
          </h2>
        </div>
        <span className="hidden font-mono text-[11px] text-neutral-600 sm:block">
          3 steps · 1 feedback loop
        </span>
      </div>

      <div className="features-grid grid gap-5 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className={`feature-card group card-glow-hover relative overflow-hidden rounded-2xl border border-border-subtle bg-panel p-6`}
          >
            <span className="font-mono text-[11px] font-bold tracking-widest text-neutral-600">
              {f.step}
            </span>
            <h3 className={`mt-3 font-display text-lg font-semibold ${f.accent}`}>{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">{f.body}</p>
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25"
              style={{ background: f.blob }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}