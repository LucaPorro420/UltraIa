'use client';

import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';

export function Dialog({
  open,
  onClose,
  title,
  children,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full max-w-2xl rounded-xl border border-border-muted bg-panel shadow-2xl [animation:var(--animate-chat-enter)] ${className}`}
      >
        <div className="flex h-10 items-center justify-between border-b border-border-subtle px-4">
          <div className="font-display text-[14px] font-semibold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-500 transition-colors duration-150 hover:bg-panel-hover hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}