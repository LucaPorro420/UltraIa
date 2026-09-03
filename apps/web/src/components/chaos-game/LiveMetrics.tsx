'use client';

interface LiveMetricsProps {
  metrics: {
    distance: number;
    lyapunovEstimate: number;
    elapsedTime: number;
    fps: number;
    primaryPoints: number;
    secondaryPoints: number;
  };
}

export function LiveMetrics({ metrics }: LiveMetricsProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-display text-sm font-semibold text-white">Live Metrics</h3>
      <div className="grid grid-cols-2 gap-2">
        <MetricRow label="Distance" value={metrics.distance.toFixed(4)} color="text-cyan-400" />
        <MetricRow label="Lyapunov" value={metrics.lyapunovEstimate.toFixed(4)} color="text-amber-400" />
        <MetricRow label="Time" value={`${metrics.elapsedTime.toFixed(1)}s`} color="text-neutral-300" />
        <MetricRow label="FPS" value={String(metrics.fps)} color="text-neutral-300" />
        <MetricRow label="Primary" value={String(metrics.primaryPoints)} color="text-green-400" />
        <MetricRow label="Secondary" value={String(metrics.secondaryPoints)} color="text-purple-400" />
      </div>
    </div>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between rounded bg-neutral-900/50 px-2 py-1">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className={`font-mono text-xs ${color}`}>{value}</span>
    </div>
  );
}
