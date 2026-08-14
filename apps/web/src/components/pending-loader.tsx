'use client';

import { useEffect, useRef } from 'react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import animationData from '@/animations/loading-dots.json';

export function PendingLoader({ label }: { label: string }) {
  const lottieRef = useRef<LottieRefCurrentProps | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce && lottieRef.current) {
      lottieRef.current.pause();
      lottieRef.current.goToAndStop(0, true);
    }
  }, []);

  return (
    <div className="glass-panel relative mx-auto w-full max-w-md overflow-hidden rounded-2xl px-6 py-8 text-center">
      <div aria-hidden className="gradient-neo-frame-strong absolute inset-x-0 top-0 h-px" />
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={true}
        className="h-16 w-24"
        aria-label="Generating agent"
        role="img"
      />
      <p className="font-display text-sm font-semibold text-neutral-100">{label}</p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        drafting blueprint → model → tools → rubric · ~15s
      </p>
    </div>
  );
}