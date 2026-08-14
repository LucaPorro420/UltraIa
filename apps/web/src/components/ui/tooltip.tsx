'use client';

import { ReactNode, useState } from 'react';

export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded border border-border-subtle bg-panel-header px-2 py-1 font-mono text-[10px] text-neutral-300 shadow-lg">
          {content}
        </span>
      )}
    </span>
  );
}