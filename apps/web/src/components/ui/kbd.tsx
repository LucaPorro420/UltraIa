import { ReactNode } from 'react';

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border-subtle bg-panel-header px-1.5 py-0.5 font-mono text-[10px] text-neutral-400">
      {children}
    </kbd>
  );
}