import { TECH_RADAR } from '@/data/tech-radar';

// * Barras de "porcentaje de uso" e "importancia" por tecnologia.
export function RoadmapChart() {
  const maxUsage = Math.max(1, ...TECH_RADAR.map((t) => t.usagePercent));
  return (
    <div className="space-y-3">
      {TECH_RADAR.map((t, i) => (
        <div
          key={t.name}
          className="grid grid-cols-[160px_1fr] items-center gap-3 rounded-lg px-2 py-1 transition-colors duration-150 hover:bg-panel-hover/60"
        >
          <span className="truncate font-mono text-[11px] text-neutral-300" title={t.name}>
            {t.name}
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full border border-border-subtle bg-input-active">
                <div
                  className="h-2 rounded-full bg-primary shadow-[0_0_10px_-2px_rgba(139,92,246,0.5)] transition-[width] duration-500 ease-out"
                  style={{ width: `${(t.usagePercent / maxUsage) * 100}%`, transitionDelay: `${i * 40}ms` }}
                />
              </div>
              <span className="w-10 text-right font-mono text-[10px] text-neutral-500">
                {t.usagePercent}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-border-subtle bg-input-active">
                <div
                  className="h-1.5 rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
                  style={{ width: `${(t.importance / 5) * 100}%`, transitionDelay: `${i * 40 + 120}ms` }}
                />
              </div>
              <span className="w-10 text-right font-mono text-[10px] text-neutral-500">
                imp {t.importance}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}