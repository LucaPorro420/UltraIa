import { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-panel p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
          {label}
        </p>
        {icon && <span className="text-neutral-600">{icon}</span>}
      </div>
      <p className="mt-2 font-display text-[22px] font-bold leading-none text-white">{value}</p>
      {hint && <p className="mt-1.5 text-[11px] text-neutral-500">{hint}</p>}
    </div>
  );
}