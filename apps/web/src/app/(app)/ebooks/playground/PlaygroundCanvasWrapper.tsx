'use client';

import dynamic from 'next/dynamic';

export const PlaygroundCanvas = dynamic(
  () => import('@/components/ebooks/playground-canvas').then((m) => m.PlaygroundCanvas),
  { loading: () => <div className="h-[360px] w-full rounded-2xl border border-border-subtle bg-input-active animate-pulse" />, ssr: false }
);