import { describe, expect, it } from 'vitest';

import {
  advanceBrainState,
  buildBrainReport,
  buildCronLine,
  buildSchtasksArgv,
  cycleIdFor,
  emptyBrainState,
  nextRunAt,
  parseBrainState,
  planBrainCycle,
  planProceduralBatch,
  resolveCerebroConfig,
  type CerebroState,
} from './cerebro';
import { PROCVID_ANIMATIONS } from './procvid';

const RELOJ = () => new Date(2026, 7, 24, 15, 0, 0); // 24/08/2026 15:00:00 local

describe('cerebro — config', () => {
  it('defaults coherentes y guardas de procvid', () => {
    const cfg = resolveCerebroConfig();
    expect(cfg.canales).toContain('youtube');
    expect(cfg.videosPorCiclo).toBeGreaterThan(0);
    expect(cfg.segundosPorVideo).toBeLessThanOrEqual(60);
    expect(cfg.ancho % 2).toBe(0);
    expect(() => resolveCerebroConfig({ ancho: 1281 })).toThrow();
    expect(() => resolveCerebroConfig({ schedule: { aLas: '25:99' } })).toThrow();
  });
});

describe('cerebro — plan del ciclo', () => {
  it('plan completo con todos los pasos activos', () => {
    const plan = planBrainCycle({}, emptyBrainState(RELOJ), RELOJ);
    expect(plan.presupuestado).toBe(true);
    expect(plan.pasos.map((p) => p.kind)).toEqual([
      'learn',
      'create_objects',
      'create_video',
      'publish',
      'report',
    ]);
    for (const p of plan.pasos) expect(p.saltado).toBe(false);
    expect(plan.cycleId).toMatch(/^\d{8}-\d{6}$/);
  });

  it('salta pasos desactivados y bloquea por presupuesto diario', () => {
    const plan = planBrainCycle({ aprender: false, objetosPorCiclo: 0 }, emptyBrainState(RELOJ), RELOJ);
    expect(plan.pasos.find((p) => p.kind === 'learn')?.saltado).toBe(true);
    expect(plan.pasos.find((p) => p.kind === 'create_objects')?.saltado).toBe(true);

    const lleno: CerebroState = { ...emptyBrainState(RELOJ), ciclosHoy: 12 };
    const plan2 = planBrainCycle({ maxCiclosPorDia: 12 }, lleno, RELOJ);
    expect(plan2.presupuestado).toBe(false);
    expect(plan2.motivoBloqueo).toContain('maxCiclosPorDia');
  });

  it('reset del contador diario cuando cambia el día', () => {
    const ayer = { ...emptyBrainState(RELOJ), diaActual: '2026-08-23', ciclosHoy: 5 };
    const plan = planBrainCycle({}, ayer, RELOJ);
    expect(plan.presupuestado).toBe(true); // nuevo día → presupuesto fresco
  });

  it('advanceBrainState acumula y rota el contador por día', () => {
    const s0 = emptyBrainState(RELOJ);
    const s1 = advanceBrainState(s0, { artefactos: 3, publicaciones: 1, lecciones: 2 }, RELOJ);
    expect(s1.ciclosTotales).toBe(1);
    expect(s1.ciclosHoy).toBe(1);
    expect(s1.artefactos).toBe(3);
    const relojManana = () => new Date(2026, 7, 25, 9, 0, 0);
    const s2 = advanceBrainState(s1, { artefactos: 1 }, relojManana);
    expect(s2.diaActual).toBe('2026-08-25');
    expect(s2.ciclosHoy).toBe(1); // día nuevo
    expect(s2.artefactos).toBe(4); // acumulado
  });

  it('parseBrainState tolera basura y resetea ciclosHoy de otro día', () => {
    expect(parseBrainState(null, RELOJ).ciclosTotales).toBe(0);
    expect(parseBrainState('nada', RELOJ).diaActual).toBe('2026-08-24');
    const st = parseBrainState(
      { ciclosTotales: 9, ciclosHoy: 4, diaActual: '2026-08-20', artefactos: 30 },
      RELOJ,
    );
    expect(st.ciclosTotales).toBe(9);
    expect(st.ciclosHoy).toBe(0); // día viejo
    expect(st.artefactos).toBe(30);
  });
});

describe('cerebro — lote procedural determinista', () => {
  it('misma semilla ⇒ mismo lote; rotación de animaciones y paletas', () => {
    const cfg = resolveCerebroConfig({ videosPorCiclo: 3, objetosPorCiclo: 2 });
    const a = planProceduralBatch(cfg, 1);
    const b = planProceduralBatch(cfg, 1);
    expect(a).toEqual(b);
    const anims = new Set(a.filter((s) => s.tipo === 'video').map((s) => s.animation));
    expect(anims.size).toBe(3);
    for (const s of a) if (s.tipo === 'video') expect(PROCVID_ANIMATIONS).toContain(s.animation as never);
    const objs = a.filter((s) => s.tipo === 'object');
    expect(objs.length).toBe(2);
    expect(objs[0].shape.m).toBeGreaterThanOrEqual(3);
  });

  it('lote vacío cuando todo está en cero', () => {
    const cfg = resolveCerebroConfig({ videosPorCiclo: 0, objetosPorCiclo: 0 });
    expect(planProceduralBatch(cfg, 7)).toEqual([]);
  });
});

describe('cerebro — programación', () => {
  it('schtasks argv daily e interval', () => {
    const daily = buildSchtasksArgv({
      taskName: 'UltraIa-Cerebro',
      mode: 'daily',
      aLas: '09:05',
      workdir: 'C:\\repo',
    });
    expect(daily.cmd).toBe('schtasks');
    expect(daily.args.join(' ')).toContain('/SC DAILY /ST 0905');
    expect(daily.args.join(' ')).toContain('cerebro-cycle.ts --run');

    const interval = buildSchtasksArgv({
      taskName: 'T',
      mode: 'interval',
      cadaNMinutos: 45,
      workdir: '/repo',
    });
    expect(interval.args.join(' ')).toContain('/SC MINUTE /MO 45');
  });

  it('cron line daily/interval y nextRunAt', () => {
    expect(buildCronLine({ taskName: 't', mode: 'daily', aLas: '07:30', workdir: '/r' })).toBe(
      '30 7 * * * cd /r && node_modules/.bin/vite-node Task/cerebro-cycle.ts --run',
    );
    expect(buildCronLine({ taskName: 't', mode: 'interval', cadaNMinutos: 120, workdir: '/r' })).toBe(
      '*/120 * * * * cd /r && node_modules/.bin/vite-node Task/cerebro-cycle.ts --run',
    );
    const cfg = resolveCerebroConfig({
      schedule: { mode: 'daily', aLas: '23:00' },
    });
    const next = nextRunAt(cfg.schedule, RELOJ)!;
    expect(next.getHours()).toBe(23);
    expect(next.getDate()).toBe(24);
    const cfg2 = resolveCerebroConfig({ schedule: { mode: 'daily', aLas: '09:00' } });
    const next2 = nextRunAt(cfg2.schedule, RELOJ)!; // 09:00 ya pasó → mañana
    expect(next2.getDate()).toBe(25);
    expect(nextRunAt(resolveCerebroConfig().schedule, RELOJ)).toBeNull(); // disabled
    expect(cycleIdFor(RELOJ)).toBe('20260824-150000');
  });
});

describe('cerebro — reporte', () => {
  it('reporte markdown con pasos, skip y errores', () => {
    const plan = planBrainCycle({}, emptyBrainState(RELOJ), RELOJ);
    const md = buildBrainReport(plan, {
      cycleId: plan.cycleId,
      artefactos: 4,
      videos: 1,
      objetos: 3,
      publicaciones: 2,
      lecciones: 5,
      errores: ['ffmpeg ausente: video omitido (fail-soft)'],
      duracionMs: 4200,
    });
    expect(md).toContain('# Cerebro — ciclo');
    expect(md).toContain('- [DO] Autoaprendizaje');
    expect(md).toContain('Artefactos: **4**');
    expect(md).toContain('Publicaciones encoladas: **2**');
    expect(md).toContain('fail-soft');

    const planSkip = planBrainCycle({ aprender: false }, emptyBrainState(RELOJ), RELOJ);
    expect(buildBrainReport(planSkip, {
      cycleId: 'x',
      artefactos: 0,
      videos: 0,
      objetos: 0,
      publicaciones: 0,
      lecciones: 0,
      errores: [],
      duracionMs: 1,
    })).toContain('[SKIP] Autoaprendizaje');
  });
});
