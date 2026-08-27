// Analyze tool overlap from the catalog and emit docs/HERRAMIENTAS-MAP.md.
// Run with the web server up: npm run dev then node scripts/analyze-tool-overlap.mjs.
import { writeFileSync } from 'node:fs';

const BASE = process.env.CATALOG_BASE || 'http://localhost:3000';
const OUT = 'docs/HERRAMIENTAS-MAP.md';

async function main() {
  const res = await fetch(`${BASE}/api/tools?lang=es`);
  const data = await res.json();
  const entries = data.tools || [];
  const byCat = {};
  for (const e of entries) byCat[e.category] = (byCat[e.category] || []).concat(e);

  const lines = ['# Mapa de Herramientas UltraIa', '', `Total: ${entries.length} herramientas en ${Object.keys(byCat).length} categorias.`, ''];
  for (const [cat, list] of Object.entries(byCat)) {
    lines.push(`## ${cat} (${list.length})`);
    for (const e of list) {
      const loc = e.i18n?.es || e.i18n?.en || {};
      lines.push(`- **${loc.name || e.id}** (${e.id}) — ruta ${e.route}`);
      if (e.related?.length) lines.push(`  - relacionado: ${e.related.join(', ')}`);
      if (e.consolidates?.length) lines.push(`  - consolida: ${e.consolidates.join(', ')}`);
    }
    lines.push('');
  }

  const overlap = {};
  for (const e of entries) {
    for (const r of e.related || []) {
      overlap[r] = (overlap[r] || new Set()).add(e.id);
    }
  }
  lines.push('## Candidatos a consolidacion (nodos compartidos)');
  for (const [node, set] of Object.entries(overlap)) {
    if (set.size > 1) lines.push(`- ${node}: ${[...set].join(', ')}`);
  }
  writeFileSync(OUT, lines.join('\n'), 'utf-8');
  console.log(`Wrote ${OUT}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
