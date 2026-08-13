// //! Instala los git hooks del proyecto (se corre UNA vez).
// * Configura core.hooksPath=.githooks para que git use nuestra carpeta de hooks.
// * Asi el "loop de documentacion" se activa solo tras cada commit.
import { execSync } from 'node:child_process';

try {
  execSync('git config core.hooksPath .githooks', { stdio: 'inherit' });
  console.log('Hooks instalados: git usara .githooks/ (post-commit -> doc-reminder.mjs).');
} catch (e) {
  console.error('No se pudo configurar core.hooksPath:', e);
  process.exit(1);
}
