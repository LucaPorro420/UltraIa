'use client';

import Image from 'next/image';
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const VIDEOS = [
  {
    src: '/reference-media/download-(15).mp4',
    eyebrow: 'Web / transformación',
    title: 'De una idea a una escena que vende',
    tone: 'from-amber-300/30 via-orange-500/10 to-transparent',
  },
  {
    src: '/reference-media/download-(16).mp4',
    eyebrow: 'Motion / narrativa',
    title: 'La interfaz entra en movimiento',
    tone: 'from-fuchsia-400/30 via-violet-500/10 to-transparent',
  },
  {
    src: '/reference-media/download-(37).mp4',
    eyebrow: 'Build / dirección',
    title: 'El agente construye mientras miras',
    tone: 'from-cyan-300/30 via-blue-500/10 to-transparent',
  },
  {
    src: '/reference-media/download-(43).mp4',
    eyebrow: 'Visual / sistema',
    title: 'Cada detalle tiene una intención',
    tone: 'from-rose-300/30 via-pink-500/10 to-transparent',
  },
];

const SCENES = [
  {
    src: '/reference-media/img-paisajes-montanas-001-5942962.jpg',
    alt: 'Montañas iluminadas por el sol',
    label: 'Explorar',
  },
  {
    src: '/reference-media/img-paisajes-playa-001-1824855.jpg',
    alt: 'Playa abierta frente al océano',
    label: 'Imaginar',
  },
  {
    src: '/reference-media/img-paisajes-desierto-001-7150369.jpg',
    alt: 'Paisaje desértico',
    label: 'Componer',
  },
  {
    src: '/reference-media/img-paisajes-ciudad-001-8170058.jpg',
    alt: 'Ciudad iluminada',
    label: 'Publicar',
  },
];

export function LandingMotionAtlas() {
  const root = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    let ctx: gsap.Context | undefined;
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      ctx = gsap.context(() => {
        gsap.from('.motion-atlas-intro', {
          opacity: 0,
          y: 22,
          duration: 0.65,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 78%' },
          clearProps: 'opacity,transform',
        });
        gsap.from('.motion-card', {
          opacity: 0,
          y: 30,
          duration: 0.7,
          stagger: 0.09,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 70%' },
          clearProps: 'opacity,transform',
        });
        gsap.from('.scene-tile', {
          opacity: 0,
          scale: 0.96,
          duration: 0.6,
          stagger: 0.07,
          ease: 'power2.out',
          scrollTrigger: { trigger: '.scene-grid', start: 'top 82%' },
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
    <section ref={root} className="border-y border-border-subtle bg-[#0b0b10] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="motion-atlas-intro grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">
              Motion atlas / 2026
            </p>
            <h2 className="mt-4 max-w-xl font-display text-3xl font-semibold leading-tight text-white sm:text-5xl">
              No mostramos herramientas. Mostramos lo que pueden hacer.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-relaxed text-neutral-400 lg:justify-self-end">
            Tomamos el lenguaje de los videos de referencia — demostración directa, ritmo vertical y
            resultado visible — y lo convertimos en una experiencia navegable para tus ideas.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VIDEOS.map((video) => (
            <article
              key={video.src}
              className="motion-card group relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#14141b] shadow-2xl shadow-black/30"
            >
              <div className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b ${video.tone}`} />
              <video
                className="aspect-[9/16] w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.035] group-hover:opacity-100"
                src={video.src}
                muted
                loop
                autoPlay
                playsInline
                preload="metadata"
                aria-label={video.title}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-5 pt-20">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
                  {video.eyebrow}
                </p>
                <h3 className="mt-2 font-display text-lg font-medium leading-snug text-white">
                  {video.title}
                </h3>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 scene-grid">
          {SCENES.map((scene) => (
            <figure key={scene.src} className="scene-tile group relative overflow-hidden rounded-xl border border-white/10">
              <Image
                src={scene.src}
                alt={scene.alt}
                width={900}
                height={1200}
                className="aspect-[4/5] w-full object-cover grayscale-[0.2] transition duration-700 group-hover:scale-105 group-hover:grayscale-0"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-4 pt-12 font-mono text-[10px] uppercase tracking-[0.2em] text-white/75">
                {scene.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
