'use client';

interface DivergenceIndicatorProps {
  diverged: boolean;
  distance: number;
}

export function DivergenceIndicator({ diverged, distance }: DivergenceIndicatorProps) {
  return (
    <div className="space-y-1">
      <h3 className="font-display text-sm font-semibold text-white">Divergence</h3>
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
          diverged
            ? 'bg-red-500/20 border border-red-500/30'
            : 'bg-green-500/20 border border-green-500/30'
        }`}
      >
        <span className={`text-lg ${diverged ? '🔴' : '🟢'}`}>
          {diverged ? '●' : '●'}
        </span>
        <div>
          <p className={`text-sm font-medium ${diverged ? 'text-red-400' : 'text-green-400'}`}>
            {diverged ? 'Diverged' : 'Tracking'}
          </p>
          <p className="font-mono text-xs text-neutral-400">
            Δ = {distance.toFixed(4)}
          </p>
        </div>
      </div>
    </div>
  );
}
