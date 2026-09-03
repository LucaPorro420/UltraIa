'use client';

import { forwardRef } from 'react';

interface AttractorSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export const AttractorSelect = forwardRef<HTMLSelectElement, AttractorSelectProps>(
  ({ value, onChange, options }, ref) => (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">
        Attractor
      </label>
      <select
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-border-subtle bg-panel px-3 py-2 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
);

AttractorSelect.displayName = 'AttractorSelect';