import { TECH_RADAR } from '@/data/tech-radar';

// * Tabla de mejoras sugeridas (backlog del roadmap) y estado de cada tecnologia.
export function RoadmapTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full text-left text-xs">
        <thead className="bg-neutral-900 text-neutral-400">
          <tr>
            <th className="px-3 py-2">Tecnologia</th>
            <th className="px-3 py-2">Categoria</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2">Mejoras posibles</th>
          </tr>
        </thead>
        <tbody>
          {TECH_RADAR.map((t) => (
            <tr key={t.name} className="border-t border-neutral-800">
              <td className="px-3 py-2 font-medium text-neutral-200">{t.name}</td>
              <td className="px-3 py-2 text-neutral-400">{t.category}</td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    t.status === 'active'
                      ? 'bg-emerald-950 text-emerald-300'
                      : t.status === 'planned'
                        ? 'bg-amber-950 text-amber-300'
                        : 'bg-red-950 text-red-300'
                  }`}
                >
                  {t.status}
                </span>
              </td>
              <td className="px-3 py-2 text-neutral-400">
                {t.improvements.length ? (
                  <ul className="list-disc pl-4">
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
