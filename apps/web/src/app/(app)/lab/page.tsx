import { requireUser } from '@/lib/server/context';
import { LabClient } from '@/components/lab-client';
import { planSdfScene, renderSdfHtml, createImage, gaussianBlur, cannyEdges, imageStats, tools } from '@ultraia/core';

export const metadata = { title: 'Lab — UltraIa' };

export default async function LabPage() {
  await requireUser();

  // Demo 1 — SDF: esfera + caja fundidas (smooth union), ray marching software keyless
  const sdfPlan = planSdfScene({
    primitives: [
      { kind: 'sphere', pos: [-0.6, 0, 0], color: '#8b5cf6', params: { radius: 0.7 } },
      { kind: 'box', pos: [0.7, 0, 0], color: '#06b6d4', params: { half: [0.55, 0.55, 0.55] } },
    ],
    ops: [{ op: 'smooth', targets: [0, 1], k: 0.5 }],
    camera: { distance: 3.2 },
  });
  const sdfHtml = renderSdfHtml(sdfPlan, { width: 400, height: 240, title: 'sdf-demo' });

  // Demo 2 — CodeVFX: plasma reactivo en canvas puro (GLSL como referencia, sin assets)
  const vfxPlan = tools.codevfx.planEffect('plasma', { intensity: 65, speed: 1.2 });
  const vfxHtml = tools.codevfx.renderEffectHtml(vfxPlan, { width: 400, height: 240, title: 'codevfx-demo' });

  // Demo 3 — Imaging: gradiente radial sintetico -> blur gaussiano -> Canny (density)
  const img = createImage(96, 96, 0);
  for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
      const dx = x - 48;
      const dy = y - 48;
      const r = Math.sqrt(dx * dx + dy * dy);
      img.data[y * 96 + x] = r <= 32 ? 1 - r / 32 : 0.15;
    }
  }
  const blurred = gaussianBlur(img, 1.2);
  const canny = cannyEdges(blurred, { low: 0.2, high: 0.6 });
  const stats = imageStats(blurred);

  // Demo 4 — Growth: critiques de la audiencia -> kpis -> experimentos + avoidances
  const critiques = [
    'el titulo no engancha',
    'el hook es muy largo y aburrido',
    'la miniatura no se distingue en el feed',
    'el titulo promete mas de lo que entrega',
    'el hook no presenta la promesa en los primeros segundos',
  ];
  const kpis = tools.growth.critiquesToKpis(critiques);
  const perfil = { pacingAvgSeg: 480, cutCadence: 5, onScreenTextDensity: 0.7, hookLengthAvg: 28, thumbnailStyle: 'texto-grande' as const };
  const exps = tools.growth.planExperiments(perfil, kpis, 3);
  const avoid = tools.growth.buildAvoidanceFromCritiques('canal-demo', critiques);

  return (
    <LabClient
      sdfHtml={sdfHtml}
      vfxHtml={vfxHtml}
      sdfFormula={sdfPlan.formula}
      vfxName={vfxPlan.name}
      imaging={{ stats, edgeDensity: canny.density, thresholds: canny.thresholds }}
      growth={{ kpis, exps, avoid, critiques }}
    />
  );
}