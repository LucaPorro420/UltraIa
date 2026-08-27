const fs = require('node:fs');
const path = require('node:path');

// Limpia la cache de vitest (node_modules/.vite) cuando los tests dan fallos
// raros tras editar (leccion documentada en loop-piv / AGENTS.md).
const targets = [
  'node_modules/.vite',
  'packages/core/node_modules/.vite',
  'packages/runtime/node_modules/.vite',
];

let cleared = 0;
for (const rel of targets) {
  const abs = path.resolve(__dirname, rel);
  try {
    fs.rmSync(abs, { recursive: true, force: true });
    cleared++;
    console.log('[test:clean] cleared', rel);
  } catch (err) {
    console.warn('[test:clean] skip', rel, '-', err.message);
  }
}
console.log('[test:clean] done (' + cleared + ' cleared)');
