// Export UltraIa tool catalog to itsfree.dev-ready Markdown + JSON.
// Run with the web server up: npm run dev then node scripts/export-tools-catalog.mjs.
// Or point CATALOG_BASE at a deployed instance.
import { mkdirSync, writeFileSync } from 'node:fs';

const LANGS = ['es','en','fr','pt','de','it','ar','hi','ja','zh','ru','nl','tr','ko'];
const BASE = process.env.CATALOG_BASE || 'http://localhost:3000';
const OUT = 'resultTask/tools-catalog';

async function main() {
  mkdirSync(OUT, { recursive: true });
  const all = {};
  for (const lang of LANGS) {
    const res = await fetch(`${BASE}/api/tools?lang=${lang}`);
    if (!res.ok) { console.warn(`skip ${lang}: ${res.status}`); continue; }
    const data = await res.json();
    const entries = data.tools || [];
    const lines = [`# UltraIa Tools (${lang})`, '', `Total: ${entries.length} herramientas`, ''];
    for (const e of entries) {
      const loc = e.i18n?.[lang] || e.i18n?.es || e.i18n?.en || {};
      lines.push(`## ${loc.name || e.id}`);
      lines.push(`- Categoria: ${e.category}`);
      lines.push(`- Ruta: ${e.route}`);
      if (loc.description) lines.push(`- ${loc.description}`);
      if (loc.tags && loc.tags.length) lines.push(`- Tags: ${loc.tags.join(', ')}`);
      lines.push('');
    }
    writeFileSync(`${OUT}/itsfree-${lang}.md`, lines.join('\n'), 'utf-8');
    all[lang] = entries;
  }
  writeFileSync(`${OUT}/tools-catalog.json`, JSON.stringify(all, null, 2), 'utf-8');
  console.log(`Exported ${Object.keys(all).length} locales to ${OUT}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
