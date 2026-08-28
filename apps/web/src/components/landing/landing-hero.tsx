'use client';

import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type LandingHeroProps = {
  user?: { name?: string | null; email: string } | null;
};

export function LandingHero({ user }: LandingHeroProps) {
  const root = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    let ctx: gsap.Context | undefined;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      ctx = gsap.context(() => {
        gsap.from('.hero-anim', {
          opacity: 0,
          y: 24,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.07,
          clearProps: 'opacity,transform',
        });
        // Terminal mock: keep typing caret alive without layout thrash
        gsap.to('.terminal-line-caret', {
          opacity: 0,
          duration: 0.6,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
        });
      }, el);
    });
    return () => {
      ctx?.revert();
      mm.revert();
    };
  }, []);

  return (
    <section
      ref={root}
      className="relative overflow-hidden border-b border-border-subtle bg-canvas py-20 sm:py-28"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]">
        <div className="absolute left-1/2 top-[-10%] h-[380px] w-[680px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.18),transparent_60%)] blur-3xl" />
        <div className="grid-dots absolute inset-0" />
      </div>

      <div className="mx-auto max-w-5xl px-6 text-center">
        <div className="hero-anim mb-4 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-panel/60 px-3 py-1 text-xs text-neutral-300">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Agentes de IA que se construyen solos
        </div>

        <h1 className="hero-anim font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
          Describe tu idea.{' '}
          <span className="gradient-neo-text">UltraIa la convierte</span> en un equipo de agentes.
        </h1>

        <p className="hero-anim mx-auto mt-5 max-w-2xl text-base text-neutral-400 sm:text-lg">
          Diseña, ejecuta y publica agentes autónomos con herramientas, memoria y bucles de
          mejora. Sin infraestructura. Sin costo para empezar.
        </p>

        <div className="hero-anim mt-8 flex flex-wrap justify-center gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_-8px_var(--color-primary)] transition-all duration-200 hover:bg-primary/85 hover:shadow-[0_0_34px_-6px_var(--color-primary)]"
              >
                Abrir dashboard
              </Link>
              <Link
                href="/agents/new"
                className="rounded-md border border-border-subtle bg-panel px-5 py-2.5 text-sm font-medium text-neutral-200 transition-colors duration-200 hover:border-neutral-600 hover:text-white"
              >
                Crear agente
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_-8px_var(--color-primary)] transition-all duration-200 hover:bg-primary/85 hover:shadow-[0_0_34px_-6px_var(--color-primary)]"
              >
                Crear tu primer agente
              </Link>
              <Link
                href="#how-it-works"
                className="rounded-md border border-border-subtle bg-panel px-5 py-2.5 text-sm font-medium text-neutral-200 transition-colors duration-200 hover:border-neutral-600 hover:text-white"
              >
                Ver cómo funciona
              </Link>
            </>
          )}
        </div>

        {/* Terminal mock */}
        <div className="hero-anim mx-auto mt-12 max-w-2xl text-left">
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-panel/80 shadow-[0_0_50px_-25px_var(--color-neo-400)]">
            <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
              <span className="ml-2 font-mono text-xs text-neutral-500">
                ultraia ~ agent-forge
              </span>
            </div>
            <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-relaxed text-neutral-300">
              <span className="text-neutral-500">$ </span>
              <span className="text-primary">ultraia</span> create agent --goal &quot;resume
              youtube trend and draft a short script&quot;
{'              '}
<span className="terminal-line-caret stream-caret" />
{'\n'}
<span className="text-green-400">✓</span> plan: 4 tools + memory + rubric
{'              '}
<span className="text-green-400">✓</span> agents forged · ready to run
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
