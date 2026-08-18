import { planEffect, EFFECT_KINDS } from '../packages/core/src/tools/codevfx.ts';
import { writeFileSync } from 'fs';

const vfxPlans = {
  '30s': [
    { kind: 'frost', intensity: 30, speed: 0.5 },  // subtle frost for naturaleza
    { kind: 'ground', intensity: 20, speed: 0.3 }, // ground particles
  ],
  '60s': [
    { kind: 'fire', intensity: 60, speed: 1.2 },      // fire embers for aventura
    { kind: 'lightning', intensity: 40, speed: 0.8 }, // lightning flashes
    { kind: 'meteor', intensity: 30, speed: 0.5 },    // meteor streaks
  ],
  '2min': [
    { kind: 'plasma', intensity: 50, speed: 0.7 },    // plasma for cultura
    { kind: 'beam', intensity: 40, speed: 0.6 },      // light beams
    { kind: 'void', intensity: 30, speed: 0.4 },      // void particles
  ],
  '30min': [
    { kind: 'frost', intensity: 20, speed: 0.2 },     // subtle frost for relax
    { kind: 'ground', intensity: 15, speed: 0.15 },   // gentle ground
    { kind: 'ice', intensity: 25, speed: 0.3 },       // ice crystals
  ],
};

const allVfx = {};
Object.entries(vfxPlans).forEach(([duration, effects]) => {
  allVfx[duration] = effects.map((e, i) => {
    const plan = planEffect(e.kind, { intensity: e.intensity, speed: e.speed });
    return {
      id: `${duration}-vfx-${i}`,
      kind: e.kind,
      ...plan,
      // When to show this VFX (as percentage of video)
      startPct: i * (1 / effects.length),
      endPct: (i + 1) * (1 / effects.length),
      blendMode: 'screen',
      opacity: 0.3 + (i * 0.1),
    };
  });
});

writeFileSync('resultTask/travel/vfx-overlays.json', JSON.stringify(allVfx, null, 2));
console.log('VFX overlays generated:', Object.keys(allVfx).map(k => `${k}: ${allVfx[k].length} effects`).join(', '));