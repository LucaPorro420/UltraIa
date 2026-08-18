import { writeFileSync } from 'fs';
import { slugifyDestino, MOTIONS, SCENE_DESC_BY_STYLE, HOOK_BY_STYLE, CTA_BY_STYLE, STYLE_MUSIC } from '../packages/core/src/tools/travel.ts';

function makeExtendedPlan(destino, estilo, idioma, duracionSeg, escenasCount) {
  const slug = slugifyDestino(destino);
  const titulo = idioma === 'es' ? `Viaje a ${destino}` : `رحلة إلى ${destino}`;
  const descs = SCENE_DESC_BY_STYLE[estilo][idioma];
  const motions = [...MOTIONS];
  const escenas = [];
  
  for (let i = 0; i < escenasCount; i++) {
    const desc = descs[i % descs.length];
    const motion = motions[(i * 3 + 1) % motions.length];
    const duracion = Math.max(4, Math.round(duracionSeg / escenasCount));
    escenas.push({
      lugar: destino,
      descripcion: desc,
      motion,
      duracionSeg: duracion,
      promptImagen: `cinematic travel photography of ${destino}, ${desc.toLowerCase()}, ${motion}, golden hour, 35mm, ultra detailed, 9:16 vertical`,
      narracion: desc,
    });
  }
  
  return {
    slug,
    titulo,
    destino,
    idioma,
    estilo,
    duracionSeg,
    hook: HOOK_BY_STYLE[estilo][idioma].replace('{destino}', destino),
    escenas,
    cta: CTA_BY_STYLE[estilo][idioma],
    musicaSugerida: STYLE_MUSIC[estilo],
  };
}

// 30s - naturaleza (already done)
// 60s - aventura (already done)
// 2min (120s) - cultura
const plan120 = makeExtendedPlan('Marruecos', 'cultura', 'es', 120, 12);
// 30min (1800s) - relax
const plan1800 = makeExtendedPlan('Bali', 'relax', 'es', 1800, 30);

writeFileSync('resultTask/travel/plan-2min.json', JSON.stringify(plan120, null, 2));
writeFileSync('resultTask/travel/plan-30min.json', JSON.stringify(plan1800, null, 2));

console.log('2min plan:', plan120.duracionSeg, 's,', plan120.escenas.length, 'escenas');
console.log('30min plan:', plan1800.duracionSeg, 's,', plan1800.escenas.length, 'escenas');