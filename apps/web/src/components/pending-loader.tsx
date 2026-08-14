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
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-panel px-6 py-8 text-center">
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={true}
        className="h-16 w-24"
        aria-label="Generating agent"
        role="img"
      />
      <p className="font-mono text-xs text-neutral-400">{label}</p>
      <p className="text-[11px] text-neutral-600">
        drafting blueprint → model → tools → rubric · ~15s
      </p>
    </div>
  );
}