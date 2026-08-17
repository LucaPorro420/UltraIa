// -----------------------------------------------------------------------------
// growth.ts — capability `growth`
// -----------------------------------------------------------------------------
// Port ORIGINAL de los PRINCIPIOS de VidRush (vidrush.ai) y Abacus.AI (abacus.ai),
// URLs en enlaces.txt (17/08/2026). Sin codigo copiado: re-diseno en el estilo del
// dominio puro de UltraIa (determinista, sin red, sin LLM).
// - VidRush "Modeled on your channel": el pipeline estudia la identidad visual del
//   canal (pacing, ritmo de edicion, cadencia de cortes, densidad de texto) antes
//   de producir -> aqui: `analyzeChannel` construye un ChannelProfile desde muestras.
// - Abacus "one variable at a time": los agentes de crecimiento testean UNA variable
//   por experimento y compilan las victorias en un playbook canal-especifico ->
//   aqui: `planExperiments` + `buildPlaybook` (deterministas, peso acumulado).
// Fuentes: learning/sources/vidrush-ai.md, learning/sources/abacus-ai.md.
// -----------------------------------------------------------------------------

export type ChannelProfile = {
  /** Duracion promedio de video (segundos). */
  pacingAvgSeg: number;
  /** Cortes por minuto promedio (cadencia de edicion). */
  cutCadence: number;
  /** Densidad de texto en pantalla 0-1 (media de frames con overlay). */
  onScreenTextDensity: number;
  /** Largo promedio del hook en caracteres. */
  hookLengthAvg: number;
  /** Estilo de thumbnail clasificado (determinista). */
  thumbnailStyle: 'texto-grande' | 'closeup' | 'comparativo' | 'mixto';
};

export type ChannelSample = {
  duracionSeg: number;
  cortes: number;
  textoPantalla: boolean;
  hookChars: number;
};

/** Variable accionable de un experimento (UNA por experimento — regla Abacus). */
export type ExperimentVariable = 'titulo' | 'hook' | 'thumbnail' | 'duracion' | 'formato';

export type ABExperiment = {
  id: string;
  variable: ExperimentVariable;
  hipotesis: string;
  control: string;
  test: string;
  decisionRule: string;
};

export type ChannelKpis = {
  /** KPI por variable 0-100 (mas alto = mejor). */
  [V in ExperimentVariable]?: number;
};

export type EngagementSignal = {
  canal: string;
  variable: ExperimentVariable;
  variante: 'control' | 'test';
  /** KPI observado 0-100. */
  kpi: number;
};

export type PlaybookEntry = {
  canal: string;
  recomendacion: string;
  /** Fuente de la recomendacion (variable que la origino). */
  fuente: ExperimentVariable;
  /** Peso acumulado (victorias) — el playbook mejora con cada senal. */
  peso: number;
};

// ------------------------------------------------------------------- hipotesis

/** Hipotesis determinista por variable (patron: "mejorar X cambia Y"). */
const HIPOTESIS: Record<ExperimentVariable, string> = {
  titulo: 'un titulo con numero y promesa especifica sube CTR sin tocar el contenido',
  hook: 'acortar el hook a < 12s reduce la caida en los primeros 30 segundos',
  thumbnail: 'thumbnail con texto grande contrastante sube el CTR en el feed',
  duracion: 'recortar la duracion al punto de retencion maxima sube AVD',
  formato: 'cambiar el formato (listicle vs explicativo) abre un nuevo segmento de audiencia',
};

const CONTROL: Record<ExperimentVariable, string> = {
  titulo: 'titulo descriptivo actual',
  hook: 'hook actual (>= 15s de introduccion)',
  thumbnail: 'thumbnail actual sin texto',
  duracion: 'duracion actual del video',
  formato: 'formato actual del canal',
};

const TEST: Record<ExperimentVariable, string> = {
  titulo: 'titulo con numero + promesa ("Los 7 errores de X que cuestan Y")',
  hook: 'hook directo <= 12s con la promesa primero',
  thumbnail: 'thumbnail con texto grande + contraste alto (Dark Obsidian)',
  duracion: 'duracion recortada al percentil 80 de retencion',
  formato: 'formato alternativo (listicle/top-N si es explicativo, o viceversa)',
};

const DECISION_RULE =
  'gana si test > control +5 puntos de KPI en >= 3 publicaciones; si no, vuelve al control';

// ------------------------------------------------------------------- analyzeChannel

/** QUÉ ES: construye el ChannelProfile desde muestras de videos publicados.
// PARA QUÉ: port de "Modeled on your channel" de VidRush — el perfil alimenta los
// experimentos (que variable mejorar primero) y el playbook (que mantener).
// POR QUÉ: determinista — media simple + clasificacion por umbrales. */
export function analyzeChannel(samples: ChannelSample[]): ChannelProfile {
  if (samples.length === 0) throw new Error('analyzeChannel requiere al menos 1 muestra');
  const n = samples.length;
  const pacingAvgSeg = samples.reduce((a, s) => a + s.duracionSeg, 0) / n;
  const cortesTotales = samples.reduce((a, s) => a + s.cortes, 0);
  const minutos = pacingAvgSeg / 60;
  const cutCadence = minutos > 0 ? cortesTotales / (minutos * n) : 0;
  const onScreenTextDensity = samples.filter((s) => s.textoPantalla).length / n;
  const hookLengthAvg = samples.reduce((a, s) => a + s.hookChars, 0) / n;
  let thumbnailStyle: ChannelProfile['thumbnailStyle'] = 'mixto';
  if (onScreenTextDensity >= 0.7) thumbnailStyle = 'texto-grande';
  else if (hookLengthAvg < 20 && onScreenTextDensity < 0.4) thumbnailStyle = 'closeup';
  else if (cutCadence >= 6 && hookLengthAvg >= 20) thumbnailStyle = 'comparativo';
  return { pacingAvgSeg: round1(pacingAvgSeg), cutCadence: round1(cutCadence), onScreenTextDensity: round2(onScreenTextDensity), hookLengthAvg: round1(hookLengthAvg), thumbnailStyle };
}

// ------------------------------------------------------------------- planExperiments

/** QUÉ ES: genera experimentos de UNA variable, priorizando las variables con peor KPI.
// PARA QUÉ: port de "one variable at a time" de Abacus — aislar el efecto de cada
// cambio; maxExperimentos capa el ruido simultaneo.
// POR QUÉ: determinista — ordena por KPI ascendente (peor primero), nunca repite
// variable, hipotesis/control/test/regla fijos por variable. */
export function planExperiments(perfil: ChannelProfile, kpis: ChannelKpis, maxExperimentos = 3): ABExperiment[] {
  const variables = (Object.keys(HIPOTESIS) as ExperimentVariable[]).filter((v) => kpis[v] !== undefined);
  if (variables.length === 0) throw new Error('planExperiments requiere al menos 1 variable con KPI');
  const peores = variables.sort((a, b) => (kpis[a] ?? 0) - (kpis[b] ?? 0));
  const cap = Math.min(Math.max(maxExperimentos, 1), peores.length);
  return peores.slice(0, cap).map((variable, i) => ({
    id: `exp-${i + 1}-${variable}`,
    variable,
    hipotesis: HIPOTESIS[variable],
    control: CONTROL[variable],
    test: TEST[variable],
    decisionRule: DECISION_RULE,
  }));
}

// ------------------------------------------------------------------- buildPlaybook

/** QUÉ ES: acumula el resultado de experimentos (signals) en un playbook por canal.
// PARA QUÉ: port de "compounding wins" de Abacus — cada victoria suma peso a una
// recomendacion persistente; las derrotas no la borran, solo la frenan.
// POR QUÉ: determinista — victoria = test supera control en >= 5 puntos; empate
// (< 5) no cambia nada; dedupe por (canal, recomendacion). */
export function buildPlaybook(canal: string, signals: EngagementSignal[]): PlaybookEntry[] {
  if (signals.length === 0) throw new Error('buildPlaybook requiere al menos 1 signal');
  const porRecomendacion = new Map<string, PlaybookEntry>();
  // procesa cada variable por pares (control_i, test_i) — cada par = un experimento
  const variablesUnicas = [...new Set(signals.map((s) => s.variable))];
  for (const variable of variablesUnicas) {
    const controles = signals.filter((o) => o.canal === canal && o.variable === variable && o.variante === 'control');
    const tests = signals.filter((o) => o.canal === canal && o.variable === variable && o.variante === 'test');
    const pares = Math.min(controles.length, tests.length);
    for (let i = 0; i < pares; i++) {
      const delta = tests[i].kpi - controles[i].kpi;
      if (delta < 5) continue; // empate o derrota: no cambia el playbook
      const recomendacion = RECOMENDACION_POR_VARIABLE[variable];
      const key = `${canal}:${recomendacion}`;
      const previa = porRecomendacion.get(key);
      if (previa) {
        porRecomendacion.set(key, { ...previa, peso: previa.peso + 1 });
      } else {
        porRecomendacion.set(key, { canal, recomendacion, fuente: variable, peso: 1 });
      }
    }
  }
  return [...porRecomendacion.values()].sort((a, b) => b.peso - a.peso);
}

/** Recomendacion accionable por variable ganadora. */
const RECOMENDACION_POR_VARIABLE: Record<ExperimentVariable, string> = {
  titulo: 'titulos con numero + promesa especifica',
  hook: 'hooks directos <= 12s (promesa primero)',
  thumbnail: 'thumbnails con texto grande contrastante',
  duracion: 'duraciones recortadas al punto de retencion maxima',
  formato: 'formato alternativo que abrio audiencia nueva',
};

// ------------------------------------------------------------------- helpers

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export const growth = { analyzeChannel, planExperiments, buildPlaybook, HIPOTESIS };