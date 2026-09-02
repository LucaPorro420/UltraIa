'use client';

import dynamic from 'next/dynamic';

export const CreateAgentForm = dynamic(
  () => import('./create-agent-form').then((m) => m.CreateAgentForm),
  { loading: () => <div className="glass-panel mt-8 rounded-xl p-5 animate-pulse space-y-6"><div className="h-4 w-48 rounded bg-panel-header" /><div className="h-4 w-72 rounded bg-panel-header" /><div className="h-4 w-96 rounded bg-panel-header" /><div className="h-10 w-full rounded bg-panel-header" /></div>, ssr: false }
);