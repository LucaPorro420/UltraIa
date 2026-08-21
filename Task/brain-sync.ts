/**
 * brain-sync.ts — capability `brain_memory` (20/08/2026):
 * construye el BRAIN.md del proyecto desde las lecciones verificadas del
 * repo (learning/LEARNINGS.md) y las fuentes de verdad (learning/truth/*.json)
 * usando el dominio puro de brain.ts (compiled_truth + timeline append-only,
 * correct by construction).
 *
 * Keyless y determinista (sin LLM ni red): las entradas se derivan de
 * encabezados y primeros parrafos de LEARNINGS.md.
 *
 * Uso:
 *   node_modules\.bin\vite-node.cmd Task/brain-sync.ts            # build completo
 *   node_modules\.bin\vite-node.cmd Task/brain-sync.ts --dry-run  # solo conteo
 *
 * Salida:
 *   resultTask/brain/BRAIN.md      (memoria persistente del proyecto)
 *   resultTask/brain/index.json    (paginas, para inspeccion)
 *   resultTask/brain/README.md     (indice)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appendBrainTimeline,
  brainStats,
  createBrainPage,
  emptyBrain,
  renderBrainMarkdown,
  renderBrainPageMarkdown,
  updateBrainTruth,
  upsertBrainPage,
  type BrainPage,
} from '../packages/core/src/tools/brain';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const write = (rel: string, content: string) => {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  return rel;
};

const TODAY = new Date().toISOString().slice(0, 10);

/** Extrae lecciones: lineas `- ` que contienen patrones de leccion. */
function extractLessons(md: string): Array<{ title: string; body: string }> {
  const lessons: Array<{ title: string; body: string }> = [];
  const lines = md.split('\n');
  let current: string[] = [];
  let title = '';
  const flush = () => {
    if (title && current.length) lessons.push({ title, body: current.join(' ').trim().slice(0, 400) });
    current = [];
  };
  for (const line of lines) {
    const m = line.match(/^#{2,3}\s+(.*)$/);
    if (m) {
      flush();
      title = m[1].trim();
    } else if (title && line.trim()) {
      current.push(line.trim());
    }
  }
  flush();
  return lessons.filter((l) => l.body.length > 20);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  let index = emptyBrain();
  let n = 0;
  try {
    const learnings = readFileSync(join(root, 'learning', 'LEARNINGS.md'), 'utf8');
    for (const lesson of extractLessons(learnings)) {
      n += 1;
      let page: BrainPage = createBrainPage(`leccion-${n}`, {
        category: 'lesson',
        title: lesson.title,
        compiledTruth: lesson.body,
        at: TODAY,
      });
      page = appendBrainTimeline(page, { at: TODAY, kind: 'evidence', summary: 'Origen: learning/LEARNINGS.md' });
      index = upsertBrainPage(index, page);
    }
  } catch {
    console.log('LEARNINGS.md no encontrado; BRAIN vacio.');
  }

  const stats = brainStats(index);
  console.log(`Paginas: ${stats.total} (lecciones: ${n}) · Timeline entries: ${stats.entradasTimeline} · Links rotos: ${stats.enlacesRotos}`);
  if (dryRun) {
    console.log('DRY-RUN: no se escribio nada.');
    return;
  }

  const md = renderBrainMarkdown(index);
  write('resultTask/brain/BRAIN.md', md);
  write(
    'resultTask/brain/index.json',
    JSON.stringify(
      {
        fecha: new Date().toISOString(),
        stats,
        paginas: index.pages.map((p) => ({
          id: p.id,
          category: p.category,
          title: p.title,
          timeline: p.timeline.length,
        })),
      },
      null,
      2,
    ),
  );
  write(
    'resultTask/brain/README.md',
    [
      '# BRAIN.md — memoria persistente del proyecto',
      '',
      `Generado: ${TODAY} · ${stats.total} paginas · ${stats.entradasTimeline} entradas de timeline`,
      '',
      'Regenerar: `node_modules\\.bin\\vite-node.cmd Task/brain-sync.ts`.',
      '',
    ].join('\n'),
  );
  console.log('Escrito: resultTask/brain/ (BRAIN.md, index.json, README.md)');
  void renderBrainPageMarkdown; // (export disponible para paginas individuales)
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});