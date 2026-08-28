'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const FEATURES: {
  step: string;
  title: string;
  body: string;
  blob: string;
  accent: string;
}[] = [
  {
    step: '01',
    title: 'Generate',
    body: 'Describe el objetivo y UltraIa diseña el agente: prompt, herramientas, memoria y rúbrica de evaluación.',
    blob: 'var(--agent-text)',
    accent: 'text-primary',
  },
  {
    step: '02',
    title: 'Run',
    body: 'El agente ejecuta contra tus datos y APIs conectadas. Sandbox, trazabilidad y límites por defecto.',
    blob: 'var(--agent-audio)',
    accent: 'text-sky-300',
  },
  {
    step: '03',
    title: 'Improve',
    body: 'Críticos y métricas señalan dónde falla. El bucle ajusta el prompt y las herramientas hasta el umbral.',
    blob: 'var(--agent-code)',
    accent: 'text-emerald-300',
  },
  {
    step: '04',
    title: 'Ship',
    body: 'Publica el resultado en todos lados — YouTube, TikTok, Instagram, X, LinkedIn y más — sin tocar un editor.',
    blob: 'var(--color-neo-400)',
    accent: 'text-fuchsia-300',
  },
];

export function LandingFeatures() {
  const root = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    let ctx: gsap.Context | undefined;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      ctx = gsap.context(() => {
        gsap.from('.feature-card', {
          opacity: 0,
          y: 18,
          duration: 0.5,
          ease: 'power2.out',
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 80%' },
          clearProps: 'opacity,transform',
        });
      }, el);
    });
    return () => {
      ctx?.revert();
      mm.revert();
    };
  }, []);

  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          De la idea al envío en un bucle.
        </h2>
        <p className="mt-3 text-neutral-400">
          Cada agente sigue el mismo ciclo de cuatro fases. Tú describes; el sistema construye,
          prueba y distribuye.
        </p>
      </div>

      <div
        ref={root}
        className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {FEATURES.map((f) => (
          <div
            key={f.step}
            className="feature-card group relative overflow-hidden rounded-2xl border border-border-subtle bg-panel p-6 transition-all duration-200 hover:border-neutral-600"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
              style={{ background: `radial-gradient(circle, ${f.blob}, transparent 70%)` }}
            />
            <div className={`font-mono text-sm font-semibold ${f.accent}`}>{f.step}</div>
            <h3 className="mt-3 font-display text-xl font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
