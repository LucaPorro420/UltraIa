// -----------------------------------------------------------------------------
// prioritize.ts — capability `prioritize`
// -----------------------------------------------------------------------------
// Port ORIGINAL de los PRINCIPIOS del "Meta-IA Prioritization Engine" documentado
// en enlaces.txt (27/08/2026). Sin codigo copiado: re-diseno en el estilo del
// dominio puro de UltraIa (determinista, sin red, sin LLM).
//
// Especificacion fuente (enlaces.txt):
//   Prioridad = Impacto x Confianza x ValorAprendizaje x Urgencia / CostoComputacional
//   Categorias: Maxima / Alta / Metaaprendizaje / Exploracion (70% explotacion,
//   20% optimizacion, 10% exploracion). Niveles A/B/C/D por impacto x confianza.
//   Motor Automatico de Priorizacion (8 pasos): 1 analizar reglas nuevas, 2 detectar
//   reglas debiles, 3 detectar cuellos de botella, 4 calcular ROI esperado, 5 calcular
//   conocimiento esperado, 6 ordenar experimentos, 7 ejecutar los mejores, 8 actualizar
//   biblioteca.
//   Plantilla JSON: experiment_id, objective, related_rules, confidence_score,
//   expected_gain, knowledge_gain, compute_cost, strategic_importance, priority_score,
//   priority_level.
// -----------------------------------------------------------------------------

export type PriorityExperiment = {
  id: string;
  objective: string;
  /** Impacto esperado 0-1. */
  impact: number;
  /** Confianza de las reglas 0-1. */
  confidence: number;
  /** Valor de aprendizaje 0-1. */
  learningValue: number;
  /** Urgencia estrategica 0-1. */
  urgency: number;
  /** Costo computacional 0-1 (mayor = mas caro). */
  computeCost: number;
  /** Peso de importancia estrategica 0-1 (metadata, usado como tie-breaker). */
  strategicImportance?: number;
  /** Reglas relacionadas (ids). */
  relatedRules?: string[];
  /** Notas libres. */
  notes?: string;
};

export type PriorityLevel = 'A' | 'B' | 'C' | 'D';

export type ScoredExperiment = {
  id: string;
  objective: string;
  score: number;
  level: PriorityLevel;
  /** Factores desglosados para trazabilidad. */
  factors: {
    impact: number;
    confidence: number;
    learningValue: number;
    urgency: number;
    computeCost: number;
  };
};

export type Rule = {
  id: string;
  description: string;
  /** Confianza de la regla 0-1. */
  confidence: number;
  /** Impacto global de la regla 0-1. */
  impact: number;
};

export type ModuleBottleneck = {
  module: string;
  /** Impacto global del cuello de botella 0-1. */
  impactGlobal: number;
};

export type PrioritizeInput = {
  experiments: PriorityExperiment[];
  rules?: Rule[];
  bottlenecks?: ModuleBottleneck[];
};

export type PrioritizeResult = {
  analyzedRules: number;
  weakRules: Rule[];
  bottlenecks: ModuleBottleneck[];
  ranked: ScoredExperiment[];
  best: ScoredExperiment | null;
  /** Actualizacion de biblioteca (resumen deterministico del ciclo). */
  libraryUpdate: {
    rules: number;
    weakRules: number;
    bottlenecks: number;
    topExperimentId: string | null;
  };
};

// ------------------------------------------------------------------- scoring

const EPS = 0.01;

/** QUÉ ES: calcula la prioridad de un experimento con la formula del documento Meta-IA.
// PARA QUÉ: la Meta-IA debe preguntarse "que experimento mejora mas el ecosistema al
// menor costo?" en vez de "que experimento puedo hacer?".
// POR QUÉ: determinista — producto de los 4 factores positivos dividido por el costo,
// clamp a [0,1] y redondeo a 4 decimales; valores NaN/clipping fuera de rango manejados. */
export function scoreExperiment(e: PriorityExperiment): number {
  const impact = clamp01(e.impact);
  const confidence = clamp01(e.confidence);
  const learningValue = clamp01(e.learningValue);
  const urgency = clamp01(e.urgency);
  const cost = Math.max(clamp01(e.computeCost), EPS);
  const raw = (impact * confidence * learningValue * urgency) / cost;
  return round4(clamp01(raw));
}

/** Nivel por score (umbrales del documento: A>=0.6, B>=0.4, C>=0.2, D<0.2). */
export function levelFor(score: number): PriorityLevel {
  if (score >= 0.6) return 'A';
  if (score >= 0.4) return 'B';
  if (score >= 0.2) return 'C';
  return 'D';
}

/** QUÉ ES: rankea un lote de experimentos por score descendente.
// PARA QUÉ: paso 6 del motor (ordenar experimentos).
// POR QUÉ: determinista — score + sort estable con tie-break por impacto*confianza;
// exponencia los factores clampados para trazabilidad. */
export function prioritizeExperiments(list: PriorityExperiment[]): ScoredExperiment[] {
  return list
    .map((e) => {
      const score = scoreExperiment(e);
      return {
        id: e.id,
        objective: e.objective,
        score,
        level: levelFor(score),
        factors: {
          impact: clamp01(e.impact),
          confidence: clamp01(e.confidence),
          learningValue: clamp01(e.learningValue),
          urgency: clamp01(e.urgency),
          computeCost: clamp01(e.computeCost),
        },
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.factors.impact * b.factors.confidence - a.factors.impact * a.factors.confidence,
    );
}

// ------------------------------------------------------------------- analysis

/** QUÉ ES: filtra reglas con confianza < threshold (debil).
// PARA QUÉ: paso 2 del motor (detectar reglas debiles).
// POR QUÉ: determinista — filtro + orden por confianza ascendente (la mas debil primero). */
export function detectWeakRules(rules: Rule[], threshold = 0.6): Rule[] {
  return rules
    .filter((r) => clamp01(r.confidence) < threshold)
    .sort((a, b) => clamp01(a.confidence) - clamp01(b.confidence));
}

/** QUÉ ES: ordena cuellos de botella por impacto global desc.
// PARA QUÉ: paso 3 del motor (detectar cuellos de botella).
// POR QUÉ: determinista — copia defensiva, sort por impactoGlobal. */
export function detectBottlenecks(modules: ModuleBottleneck[]): ModuleBottleneck[] {
  return [...modules].sort((a, b) => clamp01(b.impactGlobal) - clamp01(a.impactGlobal));
}

/** ROI esperado = ganancia esperada / costo (razon puede ser > 1, p.ej. 2x retorno).
// El costo tiene piso EPS para evitar division por cero. */
export function computeRoi(expectedGain: number, computeCost: number): number {
  return round4(clamp01(expectedGain) / Math.max(clamp01(computeCost), EPS));
}

/** Conocimiento esperado = ganancia de conocimiento / costo (razon puede ser > 1). */
export function computeKnowledge(knowledgeGain: number, computeCost: number): number {
  return round4(clamp01(knowledgeGain) / Math.max(clamp01(computeCost), EPS));
}

// ------------------------------------------------------------------- auto-motor (8 pasos)

/** QUÉ ES: ejecuta el Motor Automatico de Priorizacion de 8 pasos de forma determinista.
// PARA QUÉ: port del documento Meta-IA en enlaces.txt — la Meta-IA no debe preguntarse
// "que experimento puedo hacer?" sino "que experimento tiene la mayor probabilidad de
// mejorar el ecosistema al menor costo?".
// POR QUÉ: deterministico — los 8 pasos son calculados (no se ejecuta nada externo); el
// paso 7 ("ejecutar los mejores") devuelve el experimento top para que el llamador lo
// ejecute, y el paso 8 ("actualizar biblioteca") es un resumen del estado del ciclo. */
export function autoPrioritizeCycle(input: PrioritizeInput): PrioritizeResult {
  const rules = input.rules ?? [];
  const bottlenecks = detectBottlenecks(input.bottlenecks ?? []);
  const weakRules = detectWeakRules(rules);
  const ranked = prioritizeExperiments(input.experiments);
  const best = ranked.length > 0 ? ranked[0] : null;
  return {
    analyzedRules: rules.length,
    weakRules,
    bottlenecks,
    ranked,
    best,
    libraryUpdate: {
      rules: rules.length,
      weakRules: weakRules.length,
      bottlenecks: bottlenecks.length,
      topExperimentId: best?.id ?? null,
    },
  };
}

/** Aplica el presupuesto de exploracion (70/20/10): A=explotacion, B/C=optimizacion,
// D=exploracion ocasional. Determinista. */
export function classifyExplorationMix(ranked: ScoredExperiment[]): {
  explotation: ScoredExperiment[];
  optimization: ScoredExperiment[];
  exploration: ScoredExperiment[];
} {
  return {
    explotation: ranked.filter((e) => e.level === 'A'),
    optimization: ranked.filter((e) => e.level === 'B' || e.level === 'C'),
    exploration: ranked.filter((e) => e.level === 'D'),
  };
}

// ------------------------------------------------------------------- helpers

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

export const prioritize = {
  scoreExperiment,
  levelFor,
  prioritizeExperiments,
  detectWeakRules,
  detectBottlenecks,
  computeRoi,
  computeKnowledge,
  autoPrioritizeCycle,
  classifyExplorationMix,
};
