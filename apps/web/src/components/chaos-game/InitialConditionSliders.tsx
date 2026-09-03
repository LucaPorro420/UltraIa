'use client';

import type { StateVector } from '@ultraia/core';

interface InitialConditionSlidersProps {
  ic: StateVector;
  onChange: (index: number, value: number) => void;
  epsilon: number;
  onEpsilonChange: (value: number) => void;
}

const SLIDER_CONFIG = [
  { index: 0, label: 'X', min: -2.5, max: 2.5, step: 0.01 },
  { index: 1, label: 'Y', min: -2.5, max: 2.5, step: 0.01 },
  { index: 2, label: 'Z', min: -2.5, max: 2.5, step: 0.01 },
] as const;

export function InitialConditionSliders({
  ic,
  onChange,
  epsilon,
  onEpsilonChange,
}: InitialConditionSlidersProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-white">Initial Conditions</h3>
        <span className="font-mono text-xs text-neutral-400">
          ε = {epsilon.toFixed(4)}
        </span>
      </div>

      <div className="space-y-3">
        {SLIDER_CONFIG.map(({ index, label, min, max, step }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-neutral-300 w-4 text-right">{label}</span>
              <span className="font-mono text-xs text-primary w-16 text-right">
                {ic[index].toFixed(3)}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={ic[index]}
              onChange={e => onChange(index, parseFloat(e.target.value))}
              className="w-full accent-primary"
              aria-label={`Initial condition ${label}`}
            />
          </div>
        ))}

        {/* Epsilon slider */}
        <div className="space-y-1 pt-2 border-t border-border-subtle">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-neutral-300 w-4 text-right">ε</span>
            <span className="font-mono text-xs text-cyan-400 w-16 text-right">
              {epsilon.toFixed(4)}
            </span>
          </div>
          <input
            type="range"
            min="0.0001"
            max="0.1"
            step="0.0001"
            value={epsilon}
            onChange={e => onEpsilonChange(parseFloat(e.target.value))}
            className="w-full accent-cyan"
            aria-label="Epsilon (initial separation)"
          />
          <p className="text-xs text-neutral-500">
            Separation between trajectories (smaller = more sensitive)
          </p>
        </div>
      </div>
    </div>
  );
}