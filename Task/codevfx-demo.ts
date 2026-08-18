/**
 * Demo de la capability codevfx (patrón Elemental Sandbox — 100% code, sin assets).
 * Genera: plan de cada effect kind, reporte de colorimetría, sombreado por curvatura,
 * plan de perspectiva y un render HTML5 canvas autocontenido por kind.
 * Correr: node_modules\.bin\vite-node.cmd Task/codevfx-demo.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { colorimetryAnalyze, curvatureShade, EFFECT_KINDS, perspectivePlan, planEffect, renderEffectHtml } from '../packages/core/src/tools/codevfx';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'resultTask/codevfx');
mkdirSync(join(outDir, 'effects'), { recursive: true });

const write = (rel: string, content: string) => {
  writeFileSync(join(outDir, rel), content, 'utf8');
  return rel;
};

const written: string[] = [];

// 1) Plans de los 9 kinds
const plans = EFFECT_KINDS.map((kind) => planEffect(kind, { intensity: 65 }));
written.push(write('plans.json', JSON.stringify(plans, null, 2)));

// 2) Colorimetría de las 9 paletas
const reportes = plans.map((p) => ({
  kind: p.kind,
  palette: p.palette,
  reporte: colorimetryAnalyze([p.palette.base, p.palette.accent, p.palette.energy]),
}));
written.push(write('colorimetria.json', JSON.stringify(reportes, null, 2)));

// 3) Sombreado por curvatura de la paleta primary (Dark Obsidian)
written.push(
  write(
    'curvatura.json',
    JSON.stringify(
      {
        plano: curvatureShade('#8b5cf6', 0),
        medio: curvatureShade('#8b5cf6', 0.5),
        curvo: curvatureShade('#8b5cf6', 1),
      },
      null,
      2,
    ),
  ),
);

// 4) Plan de perspectiva con parallax
written.push(write('perspectiva.json', JSON.stringify({ threeLayers: perspectivePlan(3), fiveLayers: perspectivePlan(5, { tilt: 24 }) }, null, 2)));

// 5) Render HTML autocontenido por kind
for (const p of plans) {
  const html = renderEffectHtml(p, { width: 640, height: 360, title: `codevfx — ${p.name}` });
  written.push(write(`effects/${p.kind}.html`, html));
}

// Índice en resultTask/README.md
const readmePath = join(root, 'resultTask/README.md');
const section = `## Efectos por código (capability codevfx)

Patrón Elemental Sandbox (repo achrefelouafi/LinearAbiltyCastingThreeJS, MIT — Three.js + GLSL a mano,
post https://www.instagram.com/p/DcJDsghiJne/): efectos 100% código, sin texturas/sprites/meshes.

- \`codevfx/plans.json\` — planes de los 9 kinds (paleta, física, partículas, GLSL, hotkeys Q/W/E/R/F/X/V/C/B).
- \`codevfx/colorimetria.json\` — coherencia HSL (calor/saturación/dominante) de cada paleta.
- \`codevfx/curvatura.json\` — sombreado por curvatura (0/0.5/1) de la primary Dark Obsidian.
- \`codevfx/perspectiva.json\` — cámara (fov/distancia/tilt) + offsets de parallax por capa.
- \`codevfx/effects/*.html\` — demo canvas autocontenida por kind (abrir en navegador; reacciona a pointer y hotkey).

Abrir en navegador: \`start resultTask/codevfx/effects/fire.html\`
`;
if (readFileSync(readmePath, 'utf8').includes(section)) {
  console.log('README ya tiene la sección codevfx');
} else {
  writeFileSync(readmePath, readFileSync(readmePath, 'utf8') + section, 'utf8');
}

console.log(`codevfx demo OK - ${written.length} archivos:\n${written.join('\n')}`);
