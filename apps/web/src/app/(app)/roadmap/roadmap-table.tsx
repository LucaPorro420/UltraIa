import { TECH_RADAR } from '@/data/tech-radar';

const STATUS_STYLES: Record<string, string> = {
  active: 'border border-emerald-500/30 bg-emerald-950 text-emerald-300',
  planned: 'border border-amber-500/30 bg-amber-950 text-amber-300',
  deprecated: 'border border-red-500/30 bg-red-950 text-red-300',
};

// * Tabla de mejoras sugeridas (backlog del roadmap) y estado de cada tecnologia.
export function RoadmapTable() {
  return (
    <div className="glass-panel overflow-x-auto rounded-xl">
      <table className="w-full text-left text-xs">
        <thead className="bg-panel-header/80 text-neutral-400">
          <tr>
            <th className="px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-widest">
              Tecnologia
            </th>
            <th className="px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-widest">
              Categoria
            </th>
            <th className="px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-widest">
              Estado
            </th>
            <th className="px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-widest">
              Mejoras posibles
            </th>
          </tr>
        </thead>
        <tbody>
          {TECH_RADAR.map((t) => (
            <tr
              key={t.name}
              className="border-t border-border-subtle transition-colors duration-150 hover:bg-panel-hover"
            >
              <td className="px-4 py-2.5 font-medium text-neutral-200">{t.name}</td>
              <td className="px-4 py-2.5 font-mono text-[11px] text-neutral-500">{t.category}</td>
              <td className="px-4 py-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[t.status]}`}
                >
                  <span className="h-1 w-1 rounded-full bg-current" />
                  {t.status}
                </span>
              </td>
              <td className="px-4 py-2.5 text-neutral-400">
                {t.improvements.length ? (
                  <ul className="list-disc pl-4 space-y-0.5">
                    {t.improvements.map((imp, i) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-neutral-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}