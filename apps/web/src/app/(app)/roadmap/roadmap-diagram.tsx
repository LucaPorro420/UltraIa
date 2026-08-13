import { TECH_RADAR, type TechRadarItem } from '@/data/tech-radar';

// * Diagrama de nodos: cada tecnologia es una caja; las lineas son sus dependencias.
// * Layout deterministico: una columna por categoria, cajas apiladas dentro de la columna.
const COL_W = 230;
const ROW_H = 74;
const NODE_W = 180;
const NODE_H = 50;
const TOP = 30;

type Pos = { x: number; y: number; cx: number; cy: number };

export function RoadmapDiagram() {
  const byCat = new Map<string, TechRadarItem[]>();
  for (const t of TECH_RADAR) {
    const arr = byCat.get(t.category) ?? [];
    arr.push(t);
    byCat.set(t.category, arr);
  }
  const cats = Array.from(byCat.entries());

  const pos = new Map<string, Pos>();
  let maxRows = 0;
  cats.forEach(([cat, items], ci) => {
    items.forEach((it, ri) => {
      const x = ci * COL_W;
      const y = TOP + ri * ROW_H;
      pos.set(it.name, { x, y, cx: x + NODE_W / 2, cy: y + NODE_H / 2 });
    });
    maxRows = Math.max(maxRows, items.length);
  });

  const width = cats.length * COL_W;
  const height = TOP + maxRows * ROW_H + NODE_H;

  const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  for (const t of TECH_RADAR) {
    const a = pos.get(t.name);
    if (!a) continue;
    for (const c of t.connections) {
      const b = pos.get(c);
      if (b) lines.push({ x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy, key: `${t.name}>${c}` });
    }
  }

  return (
    <div className="overflow-auto rounded-xl border border-neutral-800 bg-neutral-950/40 p-2">
      <svg width={width} height={height} className="min-w-full">
        {lines.map((l) => (
          <line
            key={l.key}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="#7c3aed"
            strokeWidth={1.5}
            opacity={0.45}
          />
        ))}
        {cats.map(([cat, items], ci) => (
          <g key={cat}>
            <text x={ci * COL_W + NODE_W / 2} y={16} textAnchor="middle" className="fill-neutral-400 text-[11px]">
              {cat}
            </text>
            {items.map((it) => {
              const p = pos.get(it.name)!;
              return (
                <g key={it.name}>
                  <rect
                    x={p.x}
                    y={p.y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={8}
                    className="fill-neutral-900 stroke-violet-600"
                    strokeWidth={1.5}
                  />
                  <text
                    x={p.x + NODE_W / 2}
                    y={p.y + 20}
                    textAnchor="middle"
                    className="fill-white text-[11px]"
                  >
                    {it.name.length > 22 ? it.name.slice(0, 21) + '…' : it.name}
                  </text>
                  <text
                    x={p.x + NODE_W / 2}
                    y={p.y + 38}
                    textAnchor="middle"
                    className="fill-neutral-500 text-[9px]"
                  >
                    imp {it.importance}/5
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}
