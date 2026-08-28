'use client';

import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Play,
  Image as ImageIcon,
  AtSign,
  Briefcase,
  Rss,
  Send,
  Hash,
  MessageCircle,
  Music2,
  type LucideIcon,
} from 'lucide-react';
import { useRef } from 'react';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type Canal = {
  name: string;
  icon: LucideIcon;
  accent: string;
  glow: string;
};

const CANALES: Canal[] = [
  { name: 'YouTube Shorts', icon: Play, accent: 'text-red-400', glow: '#ef4444' },
  { name: 'TikTok', icon: Music2, accent: 'text-pink-300', glow: '#ec4899' },
  { name: 'Instagram', icon: ImageIcon, accent: 'text-fuchsia-400', glow: '#d946ef' },
  { name: 'Threads', icon: MessageCircle, accent: 'text-sky-300', glow: '#38bdf8' },
  { name: 'X', icon: AtSign, accent: 'text-neutral-200', glow: '#e5e7eb' },
  { name: 'LinkedIn', icon: Briefcase, accent: 'text-sky-400', glow: '#0ea5e9' },
  { name: 'Blog', icon: Rss, accent: 'text-amber-300', glow: '#fbbf24' },
  { name: 'Telegram', icon: Send, accent: 'text-cyan-300', glow: '#22d3ee' },
  { name: 'Discord', icon: MessageCircle, accent: 'text-indigo-300', glow: '#818cf8' },
  { name: 'Slack', icon: Hash, accent: 'text-emerald-300', glow: '#34d399' },
];

export function LandingEcosystem() {
  const root = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    let ctx: gsap.Context | undefined;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      ctx = gsap.context(() => {
        gsap.from('.channel-card', {
          opacity: 0,
          y: 16,
          duration: 0.45,
          ease: 'power2.out',
          stagger: 0.04,
          scrollTrigger: { trigger: '.channel-grid', start: 'top 85%' },
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
    <section id="autopub" className="border-y border-border-subtle bg-panel/40 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-panel/60 px-3 py-1 text-xs text-neutral-300">
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
            Lo que viene · AutoPublicación multicanal
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Publica en todos lados — automático, sin tocar un editor.
          </h2>
          <p className="mt-3 text-neutral-400">
            UltraIa cierra el ciclo: idea → contenido → presentación → distribución → métricas →
            mejora. Keyless-first y con aprobación humana híbrida: el texto y el blog salen solos;
            el video y la imagen pasan por tu visto bueno.
          </p>
        </div>

        <div className="channel-grid mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CANALES.map(({ name, icon: Icon, accent, glow }) => (
            <div
              key={name}
              className="channel-card group relative overflow-hidden rounded-xl border border-border-subtle bg-panel p-4 transition-all duration-200 hover:border-neutral-600"
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
                style={{ background: `radial-gradient(circle, ${glow}, transparent 70%)` }}
              />
              <Icon className={`h-6 w-6 ${accent}`} />
              <div className="mt-3 text-sm font-medium text-neutral-200">{name}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/recursos"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_-8px_var(--color-primary)] transition-all duration-200 hover:bg-primary/85"
          >
            Ver canales y configuración
          </Link>
          <Link
            href="/explore"
            className="rounded-md border border-border-subtle bg-panel px-5 py-2.5 text-sm font-medium text-neutral-200 transition-colors duration-200 hover:border-neutral-600 hover:text-white"
          >
            Explorar
          </Link>
          <Link
            href="/roadmap"
            className="rounded-md px-5 py-2.5 text-sm font-medium text-neutral-400 transition-colors duration-200 hover:text-white"
          >
            Ver roadmap técnico →
          </Link>
        </div>
      </div>
    </section>
  );
}
