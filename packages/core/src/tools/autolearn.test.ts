import { describe, expect, it } from 'vitest';

import {
  autolearn,
  buildImprovementPlan,
  detectGaps,
  learningMetrics,
  parseLearnings,
  prioritizeWork,
  scanTruthStats,
} from './autolearn';

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
    const entries = parseLearnings([
      '- A (2026-08-20): hoy',
      '- B (2026-08-19): ayer',
      '- C (2026-08-01): vieja',
      '- D: sin fecha',
    ].join('\n'));
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
  });
});