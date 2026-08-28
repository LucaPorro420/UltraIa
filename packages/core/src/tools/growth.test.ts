import { describe, it, expect } from 'vitest';
import { analyzeChannel, planExperiments, buildPlaybook, clasifyCritique, critiquesToKpis, buildAvoidanceFromCritiques, growthPlanFromCritiques, type ChannelSample, type EngagementSignal } from './growth';

describe('growth: analyzeChannel', () => {
  it('construye un perfil promedio desde muestras', () => {
    const samples: ChannelSample[] = [
      { duracionSeg: 600, cortes: 40, textoPantalla: true, hookChars: 25 },
      { duracionSeg: 300, cortes: 30, textoPantalla: true, hookChars: 35 },
      { duracionSeg: 900, cortes: 50, textoPantalla: true, hookChars: 30 },
    ];
    const p = analyzeChannel(samples);
    expect(p.pacingAvgSeg).toBe(600);
    expect(p.cutCadence).toBe(4); // 120 cortes / 30 min = 4/min
    expect(p.onScreenTextDensity).toBe(1);
    expect(p.hookLengthAvg).toBe(30);
  });

  it('clasifica thumbnailStyle como texto-grande si densidad >= 0.7', () => {
    const p = analyzeChannel([
      { duracionSeg: 600, cortes: 30, textoPantalla: true, hookChars: 30 },
      { duracionSeg: 600, cortes: 30, textoPantalla: true, hookChars: 30 },
      { duracionSeg: 600, cortes: 30, textoPantalla: true, hookChars: 30 },
      { duracionSeg: 600, cortes: 30, textoPantalla: false, hookChars: 30 },
    ]);
    expect(p.onScreenTextDensity).toBe(0.75);
    expect(p.thumbnailStyle).toBe('texto-grande');
  });

  it('clasifica closeup si hooks cortos y poca densidad de texto', () => {
    const p = analyzeChannel([
      { duracionSeg: 300, cortes: 10, textoPantalla: false, hookChars: 12 },
      { duracionSeg: 300, cortes: 10, textoPantalla: false, hookChars: 15 },
    ]);
    expect(p.thumbnailStyle).toBe('closeup');
  });

  it('clasifica comparativo si cadencia alta y hooks largos', () => {
    const p = analyzeChannel([
      { duracionSeg: 300, cortes: 40, textoPantalla: false, hookChars: 40 },
      { duracionSeg: 300, cortes: 40, textoPantalla: false, hookChars: 40 },
    ]);
    expect(p.cutCadence).toBe(8); // 80 cortes / 10 min = 8/min
    expect(p.thumbnailStyle).toBe('comparativo');
  });

  it('lanza error con muestras vacias', () => {
    expect(() => analyzeChannel([])).toThrow('al menos 1 muestra');
  });
});

describe('growth: planExperiments', () => {
  const perfil = { pacingAvgSeg: 600, cutCadence: 4, onScreenTextDensity: 0.8, hookLengthAvg: 30, thumbnailStyle: 'texto-grande' as const };

  it('prioriza las variables con peor KPI', () => {
    const exps = planExperiments(perfil, { titulo: 40, hook: 60, thumbnail: 80 });
    expect(exps.map((e) => e.variable)).toEqual(['titulo', 'hook', 'thumbnail']);
    expect(exps[0].id).toBe('exp-1-titulo');
  });

  it('UNA variable por experimento (regla Abacus)', () => {
    const exps = planExperiments(perfil, { titulo: 40, hook: 50, thumbnail: 60, duracion: 70, formato: 80 });
    const variables = exps.map((e) => e.variable);
    expect(new Set(variables).size).toBe(variables.length);
  });

  it('respeta maxExperimentos (cap)', () => {
    const exps = planExperiments(perfil, { titulo: 40, hook: 50, thumbnail: 60 }, 2);
    expect(exps).toHaveLength(2);
  });

  it('ignora variables sin KPI', () => {
    const exps = planExperiments(perfil, { titulo: 40 });
    expect(exps.map((e) => e.variable)).toEqual(['titulo']);
  });

  it('lanza error sin ninguna variable con KPI', () => {
    expect(() => planExperiments(perfil, {})).toThrow();
  });

  it('incluye hipotesis, control, test y regla de decision', () => {
    const [exp] = planExperiments(perfil, { titulo: 40 });
    expect(exp.hipotesis).toContain('CTR');
    expect(exp.control).toContain('actual');
    expect(exp.test).toContain('promesa');
    expect(exp.decisionRule).toContain('+5');
  });
});

describe('growth: buildPlaybook', () => {
  const canal = 'canal-demo';

  function signal(variable: EngagementSignal['variable'], variante: EngagementSignal['variante'], kpi: number): EngagementSignal {
    return { canal, variable, variante, kpi };
  }

  it('victoria clara (delta >= 5) agrega recomendacion con peso 1', () => {
    const book = buildPlaybook(canal, [signal('titulo', 'control', 40), signal('titulo', 'test', 55)]);
    expect(book).toHaveLength(1);
    expect(book[0].recomendacion).toContain('numero');
    expect(book[0].peso).toBe(1);
  });

  it('empate o derrota (delta < 5) no cambia el playbook', () => {
    const book = buildPlaybook(canal, [signal('hook', 'control', 50), signal('hook', 'test', 52)]);
    expect(book).toHaveLength(0);
  });

  it('acumula peso con victorias repetidas (compounding wins)', () => {
    const book = buildPlaybook(canal, [
      signal('thumbnail', 'control', 30), signal('thumbnail', 'test', 50),
      signal('thumbnail', 'control', 32), signal('thumbnail', 'test', 55),
    ]);
    expect(book[0].peso).toBe(2);
  });

  it('dedupe por (canal, recomendacion) aunque lleguen desordenadas', () => {
    const book = buildPlaybook(canal, [
      signal('duracion', 'test', 60), signal('duracion', 'control', 40),
      signal('titulo', 'control', 40), signal('titulo', 'test', 60),
    ]);
    expect(book).toHaveLength(2);
    const porFuente = new Set(book.map((e) => e.fuente));
    expect(porFuente.has('duracion')).toBe(true);
    expect(porFuente.has('titulo')).toBe(true);
  });

  it('ignora señales de otros canales', () => {
    const book = buildPlaybook('otro-canal', [signal('titulo', 'control', 40), signal('titulo', 'test', 60)]);
    expect(book).toHaveLength(0);
  });

  it('requiere par control+test por variable', () => {
    const book = buildPlaybook(canal, [signal('titulo', 'test', 60)]);
    expect(book).toHaveLength(0);
  });

  it('lanza error sin señales', () => {
    expect(() => buildPlaybook(canal, [])).toThrow('al menos 1 signal');
  });

  it('ordena por peso descendente', () => {
    const book = buildPlaybook(canal, [
      signal('titulo', 'control', 40), signal('titulo', 'test', 55),
      signal('hook', 'control', 40), signal('hook', 'test', 60),
      signal('hook', 'control', 42), signal('hook', 'test', 62),
    ]);
    expect(book[0].fuente).toBe('hook');
    expect(book[0].peso).toBe(2);
  });
});

describe('growth: puente publicationSignals (cierre F5 AutoPub)', () => {
  it('clasifica critiques en es (una por variable)', () => {
    expect(clasifyCritique('el titulo no engancha')).toBe('titulo');
    expect(clasifyCritique('el hook es muy largo')).toBe('hook');
    expect(clasifyCritique('la miniatura no se ve')).toBe('thumbnail');
    expect(clasifyCritique('el video se hace largo')).toBe('duracion');
    expect(clasifyCritique('el formato no funciona')).toBe('formato');
  });

  it('clasifica critiques en en', () => {
    expect(clasifyCritique('title is boring')).toBe('titulo');
    expect(clasifyCritique('thumbnail has no text')).toBe('thumbnail');
    expect(clasifyCritique('bad retention')).toBe('duracion');
  });

  it('devuelve null sin keyword conocida', () => {
    expect(clasifyCritique('el sonido esta mal')).toBeNull();
  });

  it('es case-insensitive y no depende del contexto', () => {
    expect(clasifyCritique('El TITULO no engancha')).toBe('titulo');
    expect(clasifyCritique('mejora el CTR con promesa')).toBe('titulo');
  });

  it('kpi = 100 - 20 x frecuencia con floor 0', () => {
    const kpis = critiquesToKpis([
      'el titulo no engancha', 'otro titulo malo', 'titulo clickbait',
      'titulo sin promesa', 'titulo confuso', 'titulo repetido',
      'el hook es largo', 'hook aburrido',
    ]);
    expect(kpis.titulo).toBe(0); // 6 quejas -> 100 - 120 -> floor 0
    expect(kpis.hook).toBe(60); // 2 quejas -> 100 - 40
  });

  it('solo incluye variables criticadas; vacio -> {}', () => {
    expect(critiquesToKpis([])).toEqual({});
    const kpis = critiquesToKpis(['el hook es largo']);
    expect(Object.keys(kpis)).toEqual(['hook']);
  });

  it('buildAvoidanceFromCritiques: peso = frecuencia, orden desc, canal incluido', () => {
    const avoid = buildAvoidanceFromCritiques('canal-demo', [
      'el titulo no engancha', 'titulo clickbait', 'titulo confuso',
      'el hook es largo',
    ]);
    expect(avoid).toHaveLength(2);
    expect(avoid[0].fuente).toBe('titulo');
    expect(avoid[0].peso).toBe(3);
    expect(avoid[0].canal).toBe('canal-demo');
    expect(avoid[0].recomendacion).toContain('evitar');
    expect(avoid[1].fuente).toBe('hook');
  });

  it('buildAvoidanceFromCritiques: vacio -> [] (degradacion elegante)', () => {
    expect(buildAvoidanceFromCritiques('canal-demo', [])).toEqual([]);
  });

  it('cierra el loop: critiques -> kpis -> planExperiments (peor KPI primero)', () => {
    const kpis = critiquesToKpis([
      'el titulo no engancha',
      'el hook es largo', 'hook aburrido', 'hook sin promesa',
    ]);
    const perfil = { pacingAvgSeg: 600, cutCadence: 4, onScreenTextDensity: 0.8, hookLengthAvg: 30, thumbnailStyle: 'texto-grande' as const };
    const exps = planExperiments(perfil, kpis);
    expect(exps[0].variable).toBe('hook'); // 3 quejas -> kpi 40 (peor)
    expect(exps[1].variable).toBe('titulo'); // 1 queja -> kpi 80
  });

  it('growthPlanFromCritiques: cierra el loop en un paso (kpis + evitar)', () => {
    const plan = growthPlanFromCritiques('canal-demo', [
      'el titulo no engancha', 'titulo clickbait', 'titulo confuso',
      'el hook es largo',
    ]);
    expect(plan.kpis.titulo).toBe(40); // 3 quejas -> 100 - 60
    expect(plan.kpis.hook).toBe(80); // 1 queja -> 100 - 20
    expect(plan.evitar).toHaveLength(2);
    expect(plan.evitar[0].fuente).toBe('titulo');
    expect(plan.evitar[0].peso).toBe(3);
  });

  it('growthPlanFromCritiques: vacio -> kpis {} + evitar [] (degradacion elegante)', () => {
    const plan = growthPlanFromCritiques('canal-demo', []);
    expect(plan.kpis).toEqual({});
    expect(plan.evitar).toEqual([]);
  });
});