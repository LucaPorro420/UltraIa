'use client';

import { createContext, use, useState, ReactNode } from 'react';

const TabsCtx = createContext<{ value: string; onChange: (v: string) => void }>({ value: '', onChange: () => {} });

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  children,
  className = '',
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const [internal, setInternal] = useState(defaultValue ?? '');
  const active = value ?? internal;
  const set = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
  };
  return (
    <TabsCtx.Provider value={{ value: active, onChange: set }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabsList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-1 border-b border-border-subtle ${className}`}>{children}</div>
  );
}

export function TabsTrigger({
  value,
  children,
  className = '',
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { value: active, onChange } = use(TabsCtx);
  const isActive = active === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`-mb-px border-b-2 px-3 py-2 text-[12px] font-semibold transition-colors duration-150 ${
        isActive
          ? 'border-primary text-white'
          : 'border-transparent text-neutral-500 hover:border-border-muted hover:text-neutral-300'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className = '',
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { value: active } = use(TabsCtx);
  if (active !== value) return null;
  return <div className={className}>{children}</div>;
}