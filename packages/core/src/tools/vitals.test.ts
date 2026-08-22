import { describe, expect, it } from 'vitest';
import {
  UMBRALES,
  aLatido,
  codigoSalida,
  computeVitals,
  construirPulso,
  decidirAccion,
  detectRegresiones,
  type Latido,
  type VitalsInput,
} from './vitals';

/** Organismo sano: todo verde, sin deuda. */
const SANO: VitalsInput = {
  tests: { total: 1314, pasados: 1314 },
  gaps: [],
  corpus: { docs: 54, fuentes: 8 },
  backlog: { total: 80, done: 77, pendientes: 0, bloqueadas: 3 },
  actividad: { commits: 6, lecciones: 3 },
  gates: { typecheck: true, lint: true, test: true, build: true },
};

describe('computeVitals (signos vitales)', () => {
  it('organismo sano -> VERDE con puntuacion alta', () => {
    const v = computeVitals(SANO);
    expect(v.estado).toBe('VERDE');
    expect(v.puntuacion).toBeGreaterThanOrEqual(UMBRALES.verde);
    expect(v.razones).not.toContain('gates');
  });

  it('un gate en ROJO fuerza estado ROJO aunque el resto compense', () => {
    const v = computeVitals({ ...SANO, gates: { ...SANO.gates, build: false } });
    expect(v.estado).toBe('ROJO');
    expect(v.signos.find((s) => s.nombre === 'gates')!.ok).toBe(false);
    expect(v.razones.join(' ')).toContain('build');
  });

  it('sin gates ejecutados el signo vale 0 y no finge salud', () => {
    const v = computeVitals({ ...SANO, gates: {} });
    expect(v.signos.find((s) => s.nombre === 'gates')!.valor).toBe(0);
    expect(v.signos.find((s) => s.nombre === 'gates')!.nota).toContain('sin gates');
    expect(v.puntuacion).toBeLessThan(SANO.tests.total);
  });

  it('las tareas bloqueadas NO cuentan como deuda propia', () => {
    const conBloqueadas = computeVitals({ ...SANO, backlog: { total: 80, done: 77, pendientes: 0, bloqueadas: 3 } });
    const sinBloqueadas = computeVitals({ ...SANO, backlog: { total: 77, done: 77, pendientes: 0 } });
    expect(conBloqueadas.signos.find((s) => s.nombre === 'backlog')!.valor).toBe(
      sinBloqueadas.signos.find((s) => s.nombre === 'backlog')!.valor,
    );
  });

  it('los gaps degradan la puntuacion de forma monotona', () => {
    const g = (n: number) => computeVitals({ ...SANO, gaps: Array.from({ length: n }, (_, i) => ({ kind: `k${i}` })) }).puntuacion;
    expect(g(0)).toBeGreaterThan(g(3));
    expect(g(3)).toBeGreaterThan(g(8));
    expect(computeVitals({ ...SANO, gaps: Array.from({ length: 50 }, () => ({ kind: 'x' })) }).signos.find((s) => s.nombre === 'gaps')!.valor).toBe(0);
  });

  it('tests a medias bajan el signo pero no fuerzan ROJO por si solos', () => {
    const v = computeVitals({ ...SANO, tests: { total: 100, pasados: 90 } });
    expect(v.signos.find((s) => s.nombre === 'tests')!.valor).toBeCloseTo(0.9, 2);
    expect(v.signos.find((s) => s.nombre === 'tests')!.ok).toBe(false);
  });

  it('es determinista: misma entrada -> misma salida', () => {
    expect(computeVitals(SANO)).toEqual(computeVitals(SANO));
  });
});

const LATIDO_PREV: Latido = {
  fecha: '2026-08-20',
  puntuacion: 92,
  estado: 'VERDE',
  tests: { total: 1314, pasados: 1314 },
  gaps: 1,
  corpus: 54,
  backlogPendientes: 0,
  gates: { typecheck: true, lint: true, test: true, build: true },
};

describe('detectRegresiones (memoria del cuerpo)', () => {
  it('sin latido previo no inventa regresiones', () => {
    expect(detectRegresiones(null, aLatido('2026-08-21', SANO, computeVitals(SANO)))).toEqual([]);
  });

  it('detecta perdida de tests, de memoria, mas gaps y caida de salud', () => {
    const curr: Latido = { ...LATIDO_PREV, fecha: '2026-08-21', tests: { total: 1300, pasados: 1300 }, corpus: 50, gaps: 4, puntuacion: 80 };
    const r = detectRegresiones(LATIDO_PREV, curr).join(' | ');
    expect(r).toContain('tests: 1314 -> 1300');
    expect(r).toContain('memoria verificada: 54 -> 50');
    expect(r).toContain('gaps abiertos: 1 -> 4');
    expect(r).toContain('salud: 92 -> 80');
  });

  it('detecta un gate que paso de VERDE a ROJO', () => {
    const curr: Latido = { ...LATIDO_PREV, gates: { ...LATIDO_PREV.gates, test: false } };
    expect(detectRegresiones(LATIDO_PREV, curr)).toContain('gate test: VERDE -> ROJO');
  });

  it('mejorar no genera regresiones', () => {
    const curr: Latido = { ...LATIDO_PREV, tests: { total: 1400, pasados: 1400 }, corpus: 60, gaps: 0, puntuacion: 95 };
    expect(detectRegresiones(LATIDO_PREV, curr)).toEqual([]);
  });
});

describe('decidirAccion (politica autonoma)', () => {
  it('gate rojo -> reparar P0 por encima de todo', () => {
    const input = { ...SANO, gates: { ...SANO.gates, lint: false }, backlog: { total: 80, done: 70, pendientes: 5 } };
    const a = decidirAccion(computeVitals(input), input);
    expect(a.modo).toBe('reparar');
    expect(a.prioridad).toBe('P0');
    expect(a.comando).toBe('npm run lint');
  });

  it('regresion sin gate rojo tambien dispara reparar', () => {
    const a = decidirAccion(computeVitals(SANO), SANO, ['tests: 1314 -> 1300']);
    expect(a.modo).toBe('reparar');
    expect(a.objetivo).toContain('1300');
  });

  it('backlog pendiente -> explotar antes que optimizar', () => {
    const input: VitalsInput = { ...SANO, backlog: { total: 80, done: 70, pendientes: 5 }, gaps: [{ kind: 'tema_sin_truth' }] };
    const a = decidirAccion(computeVitals(input), input);
    expect(a.modo).toBe('explotar');
    expect(a.objetivo).toContain('5');
  });

  it('sin backlog pero con gaps -> optimizar el tipo mas frecuente (empate por nombre asc)', () => {
    const input: VitalsInput = {
      ...SANO,
      gaps: [{ kind: 'zeta' }, { kind: 'alfa' }, { kind: 'alfa' }, { kind: 'zeta' }],
    };
    const a = decidirAccion(computeVitals(input), input);
    expect(a.modo).toBe('optimizar');
    expect(a.objetivo).toContain('alfa');
  });

  it('todo verde y sin gaps -> explorar', () => {
    const a = decidirAccion(computeVitals(SANO), SANO);
    expect(a.modo).toBe('explorar');
    expect(a.prioridad).toBe('P2');
  });
});

describe('pulso y codigo de salida', () => {
  it('el pulso incluye estado, tabla de signos, decision y regresiones', () => {
    const v = computeVitals(SANO);
    const md = construirPulso('2026-08-21', v, decidirAccion(v, SANO), ['salud: 95 -> 92'], { commit: 'abc1234', entorno: 'github-actions' });
    expect(md).toContain('# Pulso UltraIa — 2026-08-21');
    expect(md).toContain('VERDE');
    expect(md).toContain('| signo | valor | peso | estado | detalle |');
    expect(md).toContain('Regresiones desde el latido anterior');
    expect(md).toContain('Decision autonoma');
    expect(md).toContain('abc1234');
    expect(md).toContain('github-actions');
  });

  it('codigoSalida: 0 verde / 1 ambar / 2 rojo (contrato para el cron)', () => {
    expect(codigoSalida(computeVitals(SANO))).toBe(0);
    expect(codigoSalida(computeVitals({ ...SANO, gates: { ...SANO.gates, test: false } }))).toBe(2);
    const ambar = computeVitals({
      ...SANO,
      tests: { total: 100, pasados: 60 },
      gaps: Array.from({ length: 6 }, () => ({ kind: 'x' })),
      corpus: { docs: 10, fuentes: 2 },
      actividad: { commits: 0, lecciones: 0 },
      gates: { typecheck: true, lint: true },
    });
    expect(ambar.estado).toBe('AMBAR');
    expect(codigoSalida(ambar)).toBe(1);
  });

  it('aLatido reduce el estado a lo persistible y comparable', () => {
    const l = aLatido('2026-08-21', SANO, computeVitals(SANO));
    expect(l).toMatchObject({ fecha: '2026-08-21', corpus: 54, gaps: 0, backlogPendientes: 0 });
    expect(l.gates).toEqual(SANO.gates);
  });
});
