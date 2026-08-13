import { ReactNode } from 'react';

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-neutral-800 bg-neutral-900/50 ${className}`}>{children}</div>;
}
