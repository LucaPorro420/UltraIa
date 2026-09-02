'use client';

import dynamic from 'next/dynamic';

export const StudioClient = dynamic(
  () => import('./studio-client').then((m) => m.StudioClient),
  { loading: () => <div className="h-[600px] w-full animate-pulse bg-panel rounded-xl border border-border-subtle" />, ssr: false }
);