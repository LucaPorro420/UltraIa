'use client';

import { useState } from 'react';
import type { CodeExample } from '@/course/types';

export function CodeBlock({ example }: { example: CodeExample }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard
      .writeText(example.code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border-subtle bg-[#0b0b0f]">
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          {example.lang}
        </span>
        <button
          type="button"
          onClick={copy}
          className="rounded px-2 py-0.5 text-xs text-neutral-400 transition-colors duration-150 hover:text-white"
        >
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed">
        <code className="font-mono text-neutral-200">{example.code}</code>
      </pre>
      {example.caption ? (
        <p className="border-t border-border-subtle px-3 py-1.5 text-[11px] text-neutral-500">
          {example.caption}
        </p>
      ) : null}
    </div>
  );
}
