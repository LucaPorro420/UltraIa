'use client';

import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Bot, Clapperboard, Cloud, Smartphone, TrendingUp, type LucideIcon } from 'lucide-react';
import { useRef } from 'react';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type Pillar = {
  name: string;
  icon: LucideIcon;
  accent: string;
  glow: string;
  body: string;
  href: string;
  cta: string;
};

const PILLARS: Pillar[] = [
  {
    name: 'Agentes auto-construidos',
    icon: Bot,
    accent: 'text-primary',
    glow: '#8b5cf6',
    body: 'Describe el objetivo y UltraIa diseña el agente: prompt, herramientas, memoria y rúbrica de evaluación.',
    href: '/explore',
    cta: 'Explorar agentes',
  },
  {
    name: 'OMAG audiovisual',
    icon: Clapperboard,
    accent: 'text-sky-300',
    glow: '#38bdf8',
    body: 'Genera video, audio y música con críticos que evalúan identidad, sincronía y causalidad.',
    href: '/recursos',
    cta: 'Ver OMAG',
  },
  {
    name: 'Cloud gratis 2026',
    icon: Cloud,
    accent: 'text-emerald-300',
    glow: '#34d399',
    body: 'Infraestructura Cloudflare, Vercel y Supabase con costo $0 — sin cláusula comercial.',
    href: '/recursos',
    cta: 'Guía Cloud',
  },
  {
    name: 'App móvil',
    icon: Smartphone,
    accent: 'text-fuchsia-300',
    glow: '#d946ef',
    body: 'Lleva el equipo de agentes a Android e iOS con Expo. Mismo backend, misma sesión.',
    href: '/recursos',
    cta: 'Móvil (Expo)',
  },
  {
    name: 'Crecimiento',
    icon: TrendingUp,
    accent: 'text-amber-300',
    glow: '#fbbf24',
    body: 'Playbook que compone las victorias por canal: experimenta una variable, escala lo que funciona.',
    href: '/roadmap',
    cta: 'Ver crecimiento',
  },
];

const METRICS: { value: string; label: string }[] = [
  { value: '58+', label: 'capacidades' },
  { value: '11', label: 'agentes base' },
  { value: '10', label: 'canales de publishing' },
  { value: '$0', label: 'para empezar' },
];

export function LandingPillars() {
  const root = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    let ctx: gsap.Context | undefined;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      ctx = gsap.context(() => {
        gsap.from('.pillar-card', {
          opacity: 0,
          y: 16,
          duration: 0.45,
          ease: 'power2.out',
          stagger: 0.06,
          scrollTrigger: { trigger: '.pillar-grid', start: 'top 85%' },
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
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Un ecosistema, no una caja de prompts.
        </h2>
        <p className="mt-3 text-neutral-400">
          UltraIa cubre el ciclo completo: desde el agente que se diseña solo hasta el contenido
          que se publica y crece en todos lados.
        </p>
      </div>

      <div className="pillar-grid mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map(({ name, icon: Icon, accent, glow, body, href, cta }) => (
          <div
            key={name}
            className="pillar-card group relative overflow-hidden rounded-2xl border border-border-subtle bg-panel p-6 transition-all duration-200 hover:border-neutral-600"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
              style={{ background: `radial-gradient(circle, ${glow}, transparent 70%)` }}
            />
            <Icon className={`h-7 w-7 ${accent}`} />
            <h3 className="mt-4 font-display text-lg font-semibold text-white">{name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">{body}</p>
            <Link
              href={href}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-neutral-300 transition-colors duration-200 hover:text-white"
            >
              {cta} <span aria-hidden>→</span>
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-12 grid grid-cols-2 gap-4 rounded-2xl border border-border-subtle bg-panel/60 p-6 sm:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.label} className="text-center">
            <div className="font-display text-2xl font-bold gradient-neo-text sm:text-3xl">
              {m.value}
            </div>
            <div className="mt-1 text-xs text-neutral-500">{m.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
