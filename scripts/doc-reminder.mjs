// //! Script de aviso del "loop de documentacion".
// * Se ejecuta tras cada `git commit` (via .githooks/post-commit).
// * Lista los archivos .ts/.tsx que se acaban de comprometer y los anota en DOCS_TODO.md.
import { execSync } from 'node:child_process';
import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = execSync('git rev-parse --show-toplevel').toString().trim();
const out = resolve(root, 'DOCS_TODO.md');

function changedFiles() {
  try {
    const raw = execSync('git show --name-only --pretty=format: HEAD', { cwd: root }).toString();
    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /\.(ts|tsx)$/.test(l) && !l.includes('node_modules') && !l.includes('.next'));
  } catch {
    return [];
  }
}

const files = changedFiles();
const stamp = new Date().toISOString();

if (!files.length) {
  console.log('[doc-reminder] sin archivos .ts/.tsx en este commit.');
  process.exit(0);
}

const header = existsSync(out)
  ? ''
  : '# DOCS_TODO — archivos pendientes de documentar\n\nEste archivo lo genera `scripts/doc-reminder.mjs` tras cada commit.\nPara documentar un archivo, pide: "explica <archivo>" (usa la skill explain-code).\n\n';

const block =
  `\n## ${stamp}\n` +
  files.map((f) => `- [ ] ${f}`).join('\n') +
  '\n';

if (existsSync(out)) appendFileSync(out, block);
else writeFileSync(out, header + block);

console.log('[doc-reminder] anotados ' + files.length + ' archivo(s) en DOCS_TODO.md');
