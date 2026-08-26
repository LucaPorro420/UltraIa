import { describe, expect, it } from 'vitest';

import {
  autolearn,
  buildImprovementPlan,
  buildModePlan,
  classifyExperiment,
  detectGaps,
  learningMetrics,
  parseLearnings,
  planDailyLoop,
  prioritizeExperiments,
  prioritizeWork,
  scanTruthStats,
} from './autolearn';

const expA = {
  id: 'EXP-1',
  descripcion: 'Agente especializado en animacion facial',
  impacto: 0.9,
  confianza: 0.9,
  valorAprendizaje: 0.5,
  urgenciaEstrategica: 0.95,
  costoComputacional: 0.3,
  reglasRelacionadas: ['RULE-104', 'RULE-551'],
};
const expB = {
  id: 'EXP-2',
  descripcion: 'Validar iluminacion procedural',
  impacto: 0.7,
  confianza: 0.73,
  valorAprendizaje: 0.4,
  urgenciaEstrategica: 0.6,
  costoComputacional: 0.5,
};
const expC = {
  id: 'EXP-3',
  descripcion: 'Dataset especializado de texturas 3D',
  impacto: 0.4,
  confianza: 0.5,
  valorAprendizaje: 0.3,
  urgenciaEstrategica: 0.4,
  costoComputacional: 0.6,
};
const expD = {
  id: 'EXP-4',
  descripcion: 'Explorar arquitectura radical',
  impacto: 0.2,
  confianza: 0.2,
  valorAprendizaje: 0.1,
  urgenciaEstrategica: 0.2,
  costoComputacional: 0.9,
};

describe('autolearn / parseLearnings', () => {
  it('parsea bullets con metadatos (titulo, fecha, ciclo)', () => {
    const text = [
      '- **Leccion X** (20/08/2026, ciclo 69): la verdad se verifica aparte',
      '- Otra leccion sin metadatos',
      '* bullet con asterisco',
      '',
      'linea normal ignorada',
    ].join('\n');
    const entries = parseLearnings(text);
    expect(entries).toHaveLength(3);
    expect(entries[0].fecha).toBe('2026-08-20');
    expect(entries[0].ciclo).toBe('69');
    expect(entries[0].texto).toContain('verdad se verifica');
    expect(entries[1].fecha).toBe('');
    expect(entries[1].ciclo).toBe('');
    expect(entries[2].texto.length).toBeGreaterThan(0);
  });

  it('soporta fechas con formato ISO y ciclos al final', () => {
    const entries = parseLearnings('- Fecha ISO (2026-08-14, ciclo 45): algo');
    expect(entries[0].fecha).toBe('2026-08-14');
    expect(entries[0].ciclo).toBe('45');
  });

  it('cuenta lecciones del ultimo periodo (7 dias)', () => {
    // Fechas RELATIVAS al reloj: un fixture con fechas fijas envejece y rompe
    // el gate justo al cruzar la medianoche del límite (flake real 26/08).
    const d = (offsetDays: number): string => {
      const t = new Date(Date.now() - offsetDays * 86_400_000);
      const p = (n: number): string => String(n).padStart(2, '0');
      return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
    };
    const entries = parseLearnings(
      [`- A (${d(0)}): hoy`, `- B (${d(1)}): ayer`, `- C (${d(30)}): vieja`, '- D: sin fecha'].join('\n'),
    );
    expect(autolearn.countRecentLearnings(entries, 7)).toBe(2);
  });

  it('devuelve [] para texto vacio', () => {
    expect(parseLearnings('')).toEqual([]);
    expect(parseLearnings('\n\n')).toEqual([]);
  });
});

describe('autolearn / scanTruthStats', () => {
  it('cuenta docs, fuentes unicas y tipos', () => {
    const docs = [
      { fuente: 'truth_math', tipo: 'exact' },
      { fuente: 'truth_math', tipo: 'exact' },
      { fuente: 'truth_live', tipo: 'approx' },
      { fuente: 'truth_live' },
    ];
    const stats = scanTruthStats(docs);
    expect(stats.total).toBe(4);
    expect(stats.fuentes).toEqual(['truth_live', 'truth_math']);
    expect(stats.tipos).toEqual({ exact: 2, approx: 1, sin_tipo: 1 });
  });

  it('corpus vacio -> total 0', () => {
    const stats = scanTruthStats([]);
    expect(stats.total).toBe(0);
    expect(stats.fuentes).toEqual([]);
    expect(stats.tipos).toEqual({});
  });
});

describe('autolearn / detectGaps', () => {
  const learningsText = [
    '- **API directa** (2026-08-13, ciclo 2): usar API en vez de web search para numeros',
    '- **Docker** (2026-08-20, ciclo 69): infra como referencia paralela',
    '- **SQL** (2026-08-14, ciclo 39): skipDuplicates no soportado',
  ].join('\n');

  it('detecta fuentes descargadas sin RAZONAMIENTO (slug exacto)', () => {
    const gaps = detectGaps({
      learnings: [],
      truth: [],
      backlog: [],
      sources: ['sacd-nasa.md', 'video-use.md'],
      razonamientos: ['RAZONAMIENTO-SACD.md'],
    });
    const sourceGaps = gaps.filter((g) => g.kind === 'source_sin_analizar');
    // sacd-nasa.md != RAZONAMIENTO-SACD.md (slug exacto) -> ambos son gaps
    expect(sourceGaps).toHaveLength(2);
    expect(sourceGaps.map((g) => g.evidencia).sort()).toEqual([
      'learning/sources/sacd-nasa.md',
      'learning/sources/video-use.md',
    ]);
  });

  it('no marca fuente con RAZONAMIENTO coincidente (slug exacto)', () => {
    const gaps = detectGaps({
      learnings: [],
      truth: [],
      backlog: [],
      sources: ['video-use.md'],
      razonamientos: ['RAZONAMIENTO-VIDEO-USE.md'],
    });
    const sourceGaps = gaps.filter((g) => g.kind === 'source_sin_analizar');
    expect(sourceGaps).toHaveLength(0);
  });

  it('detecta lecciones sin implementar (cruza topics contra implemented)', () => {
    const gaps = detectGaps({
      learnings: learningsText,
      truth: [],
      backlog: [],
      sources: [],
      razonamientos: [],
      implemented: ['reach', 'enlaces'],
    });
    const leccionGaps = gaps.filter((g) => g.kind === 'leccion_sin_implementar');
    // 'api' no está en implemented -> gap; 'docker' tampoco -> gap; 'sql' tampoco -> gap
    expect(leccionGaps.length).toBeGreaterThanOrEqual(1);
    expect(leccionGaps.some((g) => g.descripcion.includes('api'))).toBe(true);
  });

  it('detecta temas sin truth verificada', () => {
    const gaps = detectGaps({
      learnings: learningsText,
      truth: [{ fuente: 'truth_math', tipo: 'exact', texto: 'calculo determinista' }],
      backlog: [],
      sources: [],
      razonamientos: [],
    });
    const truthGaps = gaps.filter((g) => g.kind === 'tema_sin_truth');
    // 'docker' y 'sql' y 'api' no aparecen en el texto de truth
    expect(truthGaps.some((g) => g.descripcion.includes('docker'))).toBe(true);
    expect(truthGaps.some((g) => g.descripcion.includes('api'))).toBe(true);
  });

  it('detecta backlog pendiente (palabra pendiente/pending)', () => {
    const gaps = detectGaps({
      learnings: [],
      truth: [],
      backlog: ['| 6 | Gen-Engine: entrenamiento roadmap F5 | gen-engine | pytest | pendiente |'],
      sources: [],
      razonamientos: [],
    });
    const backlogGaps = gaps.filter((g) => g.kind === 'backlog_pendiente');
    expect(backlogGaps).toHaveLength(1);
    expect(backlogGaps[0].evidencia).toContain('Gen-Engine');
  });

  it('dedupe gaps por descripcion', () => {
    const gaps = detectGaps({
      learnings: [],
      truth: [],
      backlog: ['pendiente a', 'pendiente b'],
      sources: [],
      razonamientos: [],
    });
    const backlogGaps = gaps.filter((g) => g.kind === 'backlog_pendiente');
    // dos lineas con 'pendiente' -> dedupe por descripcion identica -> 1
    expect(backlogGaps).toHaveLength(1);
  });

  it('no explota con learnings vacio', () => {
    const gaps = detectGaps({
      learnings: '',
      truth: [],
      backlog: [],
      sources: [],
      razonamientos: [],
    });
    expect(Array.isArray(gaps)).toBe(true);
  });
});

describe('autolearn / prioritizeWork (RICE simplificado)', () => {
  it('ordena por (impact*confidence)/effort desc', () => {
    const items = [
      { id: 'a', descripcion: 'alto impacto bajo esfuerzo', impact: 5, effort: 1, confidence: 1 },
      { id: 'b', descripcion: 'bajo impacto alto esfuerzo', impact: 1, effort: 5, confidence: 0.2 },
    ];
    const prioritized = prioritizeWork(items);
    expect(prioritized[0].id).toBe('a');
    expect(prioritized[0].score).toBe(5);
    expect(prioritized[1].score).toBe(0.04);
  });

  it('empates por id asc (determinista)', () => {
    const items = [
      { id: 'z', descripcion: 'x', impact: 3, effort: 1, confidence: 0.5 },
      { id: 'a', descripcion: 'y', impact: 3, effort: 1, confidence: 0.5 },
    ];
    const prioritized = prioritizeWork(items);
    expect(prioritized.map((p) => p.id)).toEqual(['a', 'z']);
  });

  it('effort 0 -> no division por cero', () => {
    const items = [{ id: 'x', descripcion: 'd', impact: 4, effort: 0, confidence: 0.5 }];
    const prioritized = prioritizeWork(items);
    expect(prioritized[0].score).toBe(2);
  });
});

describe('autolearn / buildImprovementPlan', () => {
  it('genera plan con pasos de los top-5 priorizados', () => {
    const gaps = [
      { kind: 'source_sin_analizar' as const, descripcion: 'Fuente video-use.md sin analizar', evidencia: 'learning/sources/video-use.md' },
    ];
    const priorities = prioritizeWork([
      { id: 'g1', descripcion: 'Analizar video-use', impact: 4, effort: 2, confidence: 0.9 },
    ]);
    const plan = buildImprovementPlan({ gaps, priorities, fecha: '2026-08-20' });
    expect(plan.objetivo).toContain('g1');
    expect(plan.pasos[0]).toContain('Analizar video-use');
    expect(plan.criterios).toHaveLength(3);
    expect(plan.archivos).toContain('video-use.md');
    expect(plan.prioridad).toBe('P1');
  });

  it('plan vacio -> paso por defecto', () => {
    const plan = buildImprovementPlan({ gaps: [], priorities: [], fecha: '2026-08-20' });
    expect(plan.pasos[0]).toContain('Sin gaps');
    expect(plan.prioridad).toBe('P5');
  });
});

describe('autolearn / learningMetrics', () => {
  it('calcula KPIs deterministas', () => {
    const entries = parseLearnings([
      '- A (2026-08-20): hoy',
      '- B (2026-08-01): vieja',
    ].join('\n'));
    const metrics = learningMetrics({
      entries,
      truthCount: 10,
      gaps: [ { kind: 'backlog_pendiente', descripcion: 'x', evidencia: 'y' } ],
      sourcesCount: 3,
      days: 7,
    });
    expect(metrics.leccionesTotales).toBe(2);
    expect(metrics.leccionesUltimoPeriodo).toBe(1);
    expect(metrics.truthVerificada).toBe(10);
    expect(metrics.gapsAbiertos).toBe(1);
    expect(metrics.fuentesAnalizadas).toBe(3);
    expect(metrics.tasaMejora).toBeGreaterThan(0);
    expect(metrics.tasaMejora).toBeLessThanOrEqual(1);
  });

  it('corpus vacio -> tasa 0 sin NaN', () => {
    const metrics = learningMetrics({ entries: [], truthCount: 0, gaps: [], sourcesCount: 0 });
    expect(metrics.tasaMejora).toBe(0);
    expect(metrics.leccionesTotales).toBe(0);
  });
});

describe('autolearn / namespace', () => {
  it('expone todas las funciones de la capability', () => {
    expect(typeof autolearn.parseLearnings).toBe('function');
    expect(typeof autolearn.countRecentLearnings).toBe('function');
    expect(typeof autolearn.scanTruthStats).toBe('function');
    expect(typeof autolearn.detectGaps).toBe('function');
    expect(typeof autolearn.prioritizeWork).toBe('function');
    expect(typeof autolearn.buildImprovementPlan).toBe('function');
    expect(typeof autolearn.learningMetrics).toBe('function');
    expect(typeof autolearn.classifyExperiment).toBe('function');
    expect(typeof autolearn.prioritizeExperiments).toBe('function');
    expect(typeof autolearn.planDailyLoop).toBe('function');
  });
});

describe('autolearn / classifyExperiment (matriz META-IA)', () => {
  it('umbrales A>=0.75, B>=0.5, C>=0.3, D<0.3', () => {
    expect(classifyExperiment(0.9)).toBe('A');
    expect(classifyExperiment(0.75)).toBe('A');
    expect(classifyExperiment(0.6)).toBe('B');
    expect(classifyExperiment(0.5)).toBe('B');
    expect(classifyExperiment(0.4)).toBe('C');
    expect(classifyExperiment(0.3)).toBe('C');
    expect(classifyExperiment(0.2)).toBe('D');
    expect(classifyExperiment(0)).toBe('D');
  });
});

describe('autolearn / prioritizeExperiments (fórmula META-IA)', () => {
  it('ordena por score desc y expone nivel + accion', () => {
    const [top] = prioritizeExperiments([expC, expA, expB, expD]);
    expect(top.id).toBe('EXP-1');
    expect(top.nivel).toBe('A');
    expect(top.accion).toBe('Ejecutar inmediatamente');
    const levels = prioritizeExperiments([expA, expB, expC, expD]).map((e) => e.nivel);
    expect(levels[0]).toBe('A');
    expect(levels[1]).toBe('B');
    expect(levels[2]).toBe('C');
    expect(levels[3]).toBe('D');
  });

  it('score = (impacto x confianza x aprendizaje x estrategia)/(costo+e) normalizado', () => {
    const [r] = prioritizeExperiments([expA]);
    const raw = (0.9 * 0.9 * 0.5 * 0.95) / (0.3 + 1e-9); // 1.2825
    const esperado = Math.round((raw / (1 + raw)) * 1000) / 1000; // ~0.562
    expect(r.score).toBe(esperado);
    expect(r.score).toBeGreaterThan(0.5);
    expect(r.score).toBeLessThan(0.6);
  });

  it('pesos configurables cambian el orden (anular un factor elimina su aporte)', () => {
    const fuerte = { ...expA, id: 'FUERTE', valorAprendizaje: 0.9 }; // mismo perfil, mas aprendizaje
    const flaco = { ...expA, id: 'FLACO', valorAprendizaje: 0.1 };
    const ordenDefault = prioritizeExperiments([fuerte, flaco]).map((e) => e.id);
    expect(ordenDefault).toEqual(['FUERTE', 'FLACO']); // mas aprendizaje -> primero
    const sinAprendizaje = prioritizeExperiments([fuerte, flaco], {
      impacto: 1, confianza: 1, aprendizaje: 0, estrategico: 1, costo: 1,
    });
    // Anulado el factor: ambos quedan iguales -> empate -> id asc.
    expect(sinAprendizaje[0].id).toBe('FLACO');
    expect(sinAprendizaje.map((e) => e.score)).toEqual([sinAprendizaje[1].score, sinAprendizaje[1].score]);
  });

  it('empates -> id asc; [] -> []', () => {
    const a = { ...expA, id: 'B-1' };
    const b = { ...expA, id: 'A-1' };
    expect(prioritizeExperiments([a, b])[0].id).toBe('A-1');
    expect(prioritizeExperiments([])).toEqual([]);
  });
});

describe('autolearn / planDailyLoop (presupuesto 70/20/10)', () => {
  it('agrupa por nivel y selecciona por presupuesto con los 8 pasos', () => {
    const plan = planDailyLoop([expA, expB, expC, expD], {}, '2026-08-20');
    expect(plan.fecha).toBe('2026-08-20');
    expect(plan.presupuesto.explotacion).toBe(0.7);
    expect(plan.presupuesto.optimizacion).toBe(0.2);
    expect(plan.presupuesto.exploracion).toBe(0.1);
    expect(plan.pasos).toHaveLength(8);
    expect(plan.pasos[6]).toContain('Ejecutar los mejores');
    expect(plan.reglaEstrategica).toContain('menor costo');
    expect(plan.porNivel.A.map((e) => e.id)).toEqual(['EXP-1']);
    expect(plan.porNivel.B.map((e) => e.id)).toEqual(['EXP-2']);
    expect(plan.porNivel.C.map((e) => e.id)).toEqual(['EXP-3']);
    expect(plan.porNivel.D.map((e) => e.id)).toEqual(['EXP-4']);
    // Presupuesto por pool: round(2*0.7)=1 de A+B, round(1*0.2)=0, round(1*0.1)=0.
    expect(plan.seleccionados.map((e) => e.id)).toEqual(['EXP-1']);
  });

  it('presupuesto personalizado y corte por presupuesto', () => {
    const explotacion = planDailyLoop([expA, expB, expC, expD], { explotacion: 1, optimizacion: 0, exploracion: 0 }, '2026-08-20');
    expect(explotacion.seleccionados.map((e) => e.id)).toEqual(['EXP-1', 'EXP-2']);
    const todo = planDailyLoop([expA, expB, expC, expD], { explotacion: 1, optimizacion: 1, exploracion: 1 }, '2026-08-20');
    expect(todo.seleccionados).toHaveLength(4);
  });

  it('[]) -> plan vacio sin NaN; fechas default', () => {
    const plan = planDailyLoop([]);
    expect(plan.seleccionados).toEqual([]);
    expect(plan.presupuesto.explotacion).toBe(0.7);
    expect(plan.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
describe('autolearn: buildModePlan (modos de operacion iter-75)', () => {
  it('P-P integra S-D y L-T como subfases + mejoras del harness', () => {
    const plan = buildModePlan('P-P', { fecha: '2026-08-20', prediccion: 'ok' });
    expect(plan.modo).toBe('P-P');
    expect(plan.subFases.map((s) => s.nombre)).toEqual(['Sensado', 'S-D (Spec-Design)', 'L-T (Learn-Test)', 'Investigación', 'Razonamiento']);
    expect(plan.mejoras.length).toBeGreaterThanOrEqual(4);
    expect(plan.mejoras.join(' ')).toContain('S-D integrado');
    expect(plan.mejoras.join(' ')).toContain('L-T integrado');
    expect(plan.mejoras.join(' ')).toContain('vault_manage');
    expect(plan.estrategiaVerificacion).toContain('Plan file completo');
    expect(plan.archivosSugeridos).toContain('.opencode/plans/loop-<taskid>-<slug>.md');
    expect(plan.prediccion).toBe('ok');
  });

  it('P-B subfases leen plan, adicionan mejoras, implementan, verifican FULL y ajustan', () => {
    const plan = buildModePlan('P-B');
    expect(plan.subFases.map((s) => s.nombre)).toEqual(['Leer plan del archivo', 'Adicionar mejoras', 'Implementar', 'Verificar proyecto completo', 'Ajuste']);
    expect(plan.mejoras.join(' ')).toContain('gates FULL');
    expect(plan.estrategiaVerificacion).toContain('typecheck');
    expect(plan.archivosSugeridos).toContain('packages/core/src/');
  });

  it('L-T y S-D tienen subfases propias (Learn/Test y Spec/Design)', () => {
    const lt = buildModePlan('L-T');
    expect(lt.subFases.map((s) => s.nombre)).toEqual(['Learn', 'Test']);
    expect(lt.archivosSugeridos).toContain('learning/LEARNINGS.md');
    const sd = buildModePlan('S-D');
    expect(sd.subFases.map((s) => s.nombre)).toEqual(['Spec', 'Design']);
    expect(sd.archivosSugeridos).toContain('docs/SPEC.md');
  });

  it('determinista salvo fecha/prediccion/archivos inyectables', () => {
    const a = buildModePlan('P-P');
    const b = buildModePlan('P-P');
    expect(a.subFases).toEqual(b.subFases);
    expect(a.mejoras).toEqual(b.mejoras);
    const c = buildModePlan('P-P', { archivos: ['x.ts'], prediccion: 'p' });
    expect(c.archivosSugeridos).toEqual(['x.ts']);
    expect(c.prediccion).toBe('p');
  });
});
