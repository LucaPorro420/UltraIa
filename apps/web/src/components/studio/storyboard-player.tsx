'use client';

import { useEffect, useRef, useState } from 'react';
import { Film, Pause, Play } from 'lucide-react';

interface Frame {
  url: string;
  caption: string;
}

/**
 * Player slideshow de storyboards (Studio v2): crossfade + Ken Burns CSS.
 * Respeta prefers-reduced-motion mostrando el frame estático.
 * Es la forma keyless de "reproducir" un storyboard sin ffmpeg.
 */
export function StoryboardPlayer({ frames, secondsPerFrame = 2.4 }: { frames: Frame[]; secondsPerFrame?: number }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setPlaying(false);
      return;
    }
    if (!playing || frames.length <= 1) return;
    timer.current = setInterval(() => setIdx((i) => (i + 1) % frames.length), secondsPerFrame * 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, frames.length, secondsPerFrame]);

  if (frames.length === 0) return null;
  const current = frames[Math.min(idx, frames.length - 1)];

  return (
    <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-black/40">
      {/* Keyframes locales: globals.css está congelado por la sesión concurrente (loop-104). */}
      <style jsx global>{`
        @keyframes ultraia-kenburns {
          from { transform: scale(1); }
          to { transform: scale(1.08); }
        }
        .ken-burns {
          animation: ultraia-kenburns ${secondsPerFrame + 0.6}s ease-out forwards;
        }
      `}</style>
      <div className="relative aspect-video w-full">
        {frames.map((f, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${f.url}-${i}`}
            src={f.url}
            alt={f.caption}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              playing ? 'ken-burns' : ''
            } ${i === idx ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-border-subtle px-3 py-1.5">
        <button
          type="button"
          aria-label={playing ? 'Pausar' : 'Reproducir'}
          onClick={() => setPlaying((p) => !p)}
          className="rounded p-1 text-neutral-400 transition-colors duration-150 hover:bg-panel-hover hover:text-primary"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          <Film className="mr-1 inline h-3 w-3" />
          {idx + 1}/{frames.length} · {current.caption}
        </span>
        <span className="ml-auto flex gap-1">
          {frames.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir al frame ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-1.5 w-1.5 rounded-full transition-colors duration-150 ${
                i === idx ? 'bg-primary' : 'bg-border-subtle hover:bg-primary/50'
              }`}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
