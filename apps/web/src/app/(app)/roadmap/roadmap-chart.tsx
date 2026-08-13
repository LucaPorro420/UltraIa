import { TECH_RADAR } from '@/data/tech-radar';

// * Barras de "porcentaje de uso" e "importancia" por tecnologia.
export function RoadmapChart() {
  const maxUsage = Math.max(1, ...TECH_RADAR.map((t) => t.usagePercent));
  return (
    <div className="space-y-3">
      {TECH_RADAR.map((t) => (
        <div key={t.name} className="grid grid-cols-[160px_1fr] items-center gap-3">
          <span className="truncate text-xs text-neutral-300" title={t.name}>
            {t.name}
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-neutral-800">
                <div
                  className="h-2 rounded-full bg-violet-500"
                  style={{ width: `${(t.usagePercent / maxUsage) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right text-[10px] text-neutral-500">{t.usagePercent}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-neutral-800">
                <div
                  className="h-1.5 rounded-full bg-emerald-500"
                  style={{ width: `${(t.importance / 5) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right text-[10px] text-neutral-500">imp {t.importance}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
