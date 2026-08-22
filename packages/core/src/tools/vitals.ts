// -----------------------------------------------------------------------------
// vitals.ts — SIGNOS VITALES Y SISTEMA AUTONOMO (el "latido" de UltraIa, iter-82)
//
// El proyecto ya tenia cerebro (`autolearn`: detecta gaps, prioriza con META-IA y
// escribe el plan) y memoria (`semantic-memory` en-proceso + `qdrant-memory`
// persistente). Lo que faltaba era el sistema AUTONOMO: un latido que mida el
// estado del organismo, detecte deterioro sin que nadie pregunte y decida por si
// mismo cual es la siguiente accion.
//
// Este modulo es dominio PURO y determinista (0 deps, sin red, sin reloj: los
// tiempos entran como parametro para que los tests sean reproducibles):
// - `computeVitals(input)`   -> puntuacion 0-100 + estado VERDE/AMBAR/ROJO + signos
// - `detectRegresiones(a,b)` -> que empeoro entre dos latidos (memoria del cuerpo)
// - `decidirAccion(...)`     -> politica autonoma: reparar / explotar / optimizar / explorar
// - `construirPulso(...)`    -> el parte medico en markdown (lo que se commitea)
//
// El runner `Task/heartbeat.ts` lo alimenta con estado real y el workflow
// `.github/workflows/heartbeat.yml` lo ejecuta en la nube gratis (cron).
// -----------------------------------------------------------------------------

/** Gates del pipeline CI. `null` = no ejecutado en este latido. */
export type GateName = 'typecheck' | 'lint' | 'test' | 'build';
export type GateStatus = Partial<Record<GateName, boolean | null>>;

/** Estado crudo del organismo en un instante (lo mide el runner, no este modulo). */
export type VitalsInput = {
  /** Suite completa: total y pasados (si no se corrio, ambos 0). */
  tests: { total: number; pasados: number };
  /** Gaps abiertos del autoaprendizaje, por tipo (`tema_sin_truth`, `backlog_pendiente`, ...). */
  gaps: Array<{ kind: string; score?: number }>;
  /** Memoria verificada: documentos indexables y fuentes distintas. */
  corpus: { docs: number; fuentes: number };
  /** Backlog de STATE.md. */
  backlog: { total: number; done: number; pendientes: number; bloqueadas?: number };
  /** Actividad reciente (ventana del runner, normalmente 7 dias). */
  actividad: { commits: number; lecciones: number };
  /** Resultado de los gates en este latido. */
  gates: GateStatus;
};

/** Un signo vital medido: valor normalizado 0-1, su peso y por que. */
export type VitalSign = {
  nombre: string;
  valor: number;
  peso: number;
  ok: boolean;
  nota: string;
};

export type EstadoSalud = 'VERDE' | 'AMBAR' | 'ROJO';

export type Vitals = {
  puntuacion: number;
  estado: EstadoSalud;
  signos: VitalSign[];
  razones: string[];
};

/** Umbrales de estado (VERDE >= 80, AMBAR >= 55, ROJO por debajo). */
export const UMBRALES = { verde: 80, ambar: 55 } as const;

/** Pesos de cada signo vital. Suman 1. Gates pesan mas: son la linea de vida. */
export const PESOS_VITALES = {
  gates: 0.35,
  tests: 0.2,
  backlog: 0.15,
  gaps: 0.15,
  memoria: 0.1,
  actividad: 0.05,
} as const;

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);
const round2 = (x: number) => Math.round(x * 100) / 100;

/**
 * Calcula los signos vitales del proyecto (puro, determinista).
 *
 * Cada signo se normaliza a 0-1 y se pondera con `PESOS_VITALES`:
 * - gates: fraccion de gates en verde (un gate ROJO es la senal mas grave).
 * - tests: fraccion de tests que pasan (0 si no se corrio la suite).
 * - backlog: fraccion de tareas cerradas sobre las accionables (las bloqueadas
 *   no cuentan como deuda propia: dependen de un humano o de otra sesion).
 * - gaps: decae con el numero de gaps abiertos (0 gaps = 1; 10+ gaps = 0).
 * - memoria: crece con el corpus verificado y satura en 200 docs.
 * - actividad: commits + lecciones de la ventana, satura en 10 eventos.
 */
export function computeVitals(input: VitalsInput): Vitals {
  const gatesEjecutados = (Object.keys(input.gates) as GateName[]).filter((g) => input.gates[g] !== null && input.gates[g] !== undefined);
  const gatesVerdes = gatesEjecutados.filter((g) => input.gates[g] === true);
  const gatesRojos = gatesEjecutados.filter((g) => input.gates[g] === false);
  const vGates = gatesEjecutados.length === 0 ? 0 : gatesVerdes.length / gatesEjecutados.length;

  const vTests = input.tests.total === 0 ? 0 : clamp01(input.tests.pasados / input.tests.total);

  const bloqueadas = input.backlog.bloqueadas ?? 0;
  const accionables = Math.max(0, input.backlog.total - bloqueadas);
  const vBacklog = accionables === 0 ? 1 : clamp01(input.backlog.done / accionables);

  const vGaps = clamp01(1 - input.gaps.length / 10);
  const vMemoria = clamp01(input.corpus.docs / 200);
  const vActividad = clamp01((input.actividad.commits + input.actividad.lecciones) / 10);

  const signos: VitalSign[] = [
    {
      nombre: 'gates',
      valor: round2(vGates),
      peso: PESOS_VITALES.gates,
      ok: gatesRojos.length === 0 && gatesEjecutados.length > 0,
      nota: gatesEjecutados.length === 0 ? 'sin gates ejecutados en este latido' : `${gatesVerdes.length}/${gatesEjecutados.length} verdes${gatesRojos.length ? ` (ROJO: ${gatesRojos.join(', ')})` : ''}`,
    },
    {
      nombre: 'tests',
      valor: round2(vTests),
      peso: PESOS_VITALES.tests,
      ok: input.tests.total > 0 && input.tests.pasados === input.tests.total,
      nota: `${input.tests.pasados}/${input.tests.total} tests`,
    },
    {
      nombre: 'backlog',
      valor: round2(vBacklog),
      peso: PESOS_VITALES.backlog,
      ok: input.backlog.pendientes === 0,
      nota: `${input.backlog.done}/${accionables} accionables cerradas, ${input.backlog.pendientes} pendientes${bloqueadas ? `, ${bloqueadas} bloqueadas` : ''}`,
    },
    {
      nombre: 'gaps',
      valor: round2(vGaps),
      peso: PESOS_VITALES.gaps,
      ok: input.gaps.length <= 2,
      nota: `${input.gaps.length} gaps abiertos`,
    },
    {
      nombre: 'memoria',
      valor: round2(vMemoria),
      peso: PESOS_VITALES.memoria,
      ok: input.corpus.docs > 0,
      nota: `${input.corpus.docs} docs verificados de ${input.corpus.fuentes} fuentes`,
    },
    {
      nombre: 'actividad',
      valor: round2(vActividad),
      peso: PESOS_VITALES.actividad,
      ok: input.actividad.commits + input.actividad.lecciones > 0,
      nota: `${input.actividad.commits} commits + ${input.actividad.lecciones} lecciones`,
    },
  ];

  const puntuacion = Math.round(signos.reduce((s, x) => s + x.valor * x.peso, 0) * 100);

  // Un gate en ROJO fuerza estado ROJO aunque el resto compense: es una parada
  // cardiaca, no un promedio bajo (misma logica que "no commitear con gates rojos").
  const estado: EstadoSalud =
    gatesRojos.length > 0 ? 'ROJO' : puntuacion >= UMBRALES.verde ? 'VERDE' : puntuacion >= UMBRALES.ambar ? 'AMBAR' : 'ROJO';

  const razones = signos.filter((s) => !s.ok).map((s) => `${s.nombre}: ${s.nota}`);
  return { puntuacion, estado, signos, razones };
}

/** Latido guardado: lo que el runner persiste para poder comparar con el siguiente. */
export type Latido = {
  fecha: string;
  puntuacion: number;
  estado: EstadoSalud;
  tests: { total: number; pasados: number };
  gaps: number;
  corpus: number;
  backlogPendientes: number;
  gates: GateStatus;
};

/** Reduce unos vitals + su input al latido persistible (sin reloj: `fecha` entra dada). */
export function aLatido(fecha: string, input: VitalsInput, vitals: Vitals): Latido {
  return {
    fecha,
    puntuacion: vitals.puntuacion,
    estado: vitals.estado,
    tests: { ...input.tests },
    gaps: input.gaps.length,
    corpus: input.corpus.docs,
    backlogPendientes: input.backlog.pendientes,
    gates: { ...input.gates },
  };
}

/**
 * Compara el latido anterior con el actual y devuelve SOLO lo que empeoro.
 *
 * Es la memoria del cuerpo: sin esto el sistema no sabe si esta mejorando o
 * degradandose, y un agente que no puede detectar su propio deterioro no puede
 * mejorarse a si mismo. Determinista y sin umbrales magicos: cualquier caida
 * cuenta, porque en este repo un test menos siempre significa algo.
 */
export function detectRegresiones(prev: Latido | null, curr: Latido): string[] {
  if (!prev) return [];
  const r: string[] = [];
  if (curr.tests.total < prev.tests.total) r.push(`tests: ${prev.tests.total} -> ${curr.tests.total} (se perdieron ${prev.tests.total - curr.tests.total})`);
  if (curr.tests.pasados < curr.tests.total) r.push(`tests en rojo: ${curr.tests.total - curr.tests.pasados} fallando`);
  if (curr.corpus < prev.corpus) r.push(`memoria verificada: ${prev.corpus} -> ${curr.corpus} docs`);
  if (curr.gaps > prev.gaps) r.push(`gaps abiertos: ${prev.gaps} -> ${curr.gaps}`);
  if (curr.puntuacion < prev.puntuacion) r.push(`salud: ${prev.puntuacion} -> ${curr.puntuacion}`);
  for (const g of Object.keys(curr.gates) as GateName[]) {
    if (prev.gates[g] === true && curr.gates[g] === false) r.push(`gate ${g}: VERDE -> ROJO`);
  }
  return r;
}

/** Modos de la politica autonoma (heredan el presupuesto 70/20/10 de autolearn). */
export type ModoAccion = 'reparar' | 'explotar' | 'optimizar' | 'explorar';

export type AccionAutonoma = {
  modo: ModoAccion;
  objetivo: string;
  razon: string;
  prioridad: 'P0' | 'P1' | 'P2';
  comando?: string;
};

/**
 * Decide QUE hacer a continuacion, sin humano. Politica determinista y ordenada
 * por gravedad (la primera condicion que se cumple gana):
 *
 * 1. `reparar`  (P0) — hay regresiones o un gate en ROJO: nada mas importa.
 * 2. `explotar` (P1) — hay backlog accionable pendiente: ejecutar lo comprometido.
 * 3. `optimizar`(P1) — sin backlog pero con gaps: cerrar deuda de conocimiento.
 * 4. `explorar` (P2) — todo verde y sin gaps: buscar informacion nueva.
 *
 * Es exactamente el reparto 70/20/10 del motor META-IA, pero decidido por el
 * estado real del organismo en vez de por un presupuesto fijo.
 */
export function decidirAccion(vitals: Vitals, input: VitalsInput, regresiones: string[] = []): AccionAutonoma {
  const gatesRojos = (Object.keys(input.gates) as GateName[]).filter((g) => input.gates[g] === false);
  if (gatesRojos.length > 0 || regresiones.length > 0) {
    return {
      modo: 'reparar',
      objetivo: gatesRojos.length ? `gates en rojo: ${gatesRojos.join(', ')}` : regresiones[0],
      razon: 'el organismo se esta degradando: reparar antes que avanzar (regla: no commitear con gates rojos)',
      prioridad: 'P0',
      comando: gatesRojos.length ? `npm run ${gatesRojos[0]}` : 'npx vite-node Task/heartbeat.ts',
    };
  }
  if (input.backlog.pendientes > 0) {
    return {
      modo: 'explotar',
      objetivo: `cerrar ${input.backlog.pendientes} tarea(s) pendientes del backlog`,
      razon: 'hay trabajo comprometido sin cerrar: explotacion antes que exploracion',
      prioridad: 'P1',
      comando: 'python scripts/autolearn.py --dry-run',
    };
  }
  if (input.gaps.length > 0) {
    const porTipo = new Map<string, number>();
    for (const g of input.gaps) porTipo.set(g.kind, (porTipo.get(g.kind) ?? 0) + 1);
    const top = [...porTipo.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    return {
      modo: 'optimizar',
      objetivo: `cerrar ${top[1]} gap(s) de tipo ${top[0]}`,
      razon: 'sin backlog pendiente: la deuda de conocimiento es lo que mas rinde',
      prioridad: 'P1',
      comando: 'python scripts/autolearn.py',
    };
  }
  return {
    modo: 'explorar',
    objetivo: 'buscar fuentes nuevas y ampliar la memoria verificada',
    razon: `todo verde (${vitals.puntuacion}/100) y sin gaps: toca exploracion`,
    prioridad: 'P2',
    comando: 'npx vite-node Task/sync-qdrant.ts -- --dry-run',
  };
}

const barra = (v: number, ancho = 20) => '#'.repeat(Math.round(v * ancho)).padEnd(ancho, '.');

/**
 * Parte medico en markdown: es el artefacto que el cron de la nube commitea, y
 * lo que un humano lee en 10 segundos para saber si el organismo esta vivo.
 */
export function construirPulso(
  fecha: string,
  vitals: Vitals,
  accion: AccionAutonoma,
  regresiones: string[] = [],
  meta: { commit?: string; entorno?: string } = {},
): string {
  const icono = vitals.estado === 'VERDE' ? '🟢' : vitals.estado === 'AMBAR' ? '🟡' : '🔴';
  const l: string[] = [];
  l.push(`# Pulso UltraIa — ${fecha}`);
  l.push('');
  l.push(`**Estado**: ${icono} ${vitals.estado} · **Salud**: ${vitals.puntuacion}/100${meta.entorno ? ` · **Entorno**: ${meta.entorno}` : ''}${meta.commit ? ` · **Commit**: \`${meta.commit}\`` : ''}`);
  l.push('');
  l.push('## Signos vitales');
  l.push('');
  l.push('| signo | valor | peso | estado | detalle |');
  l.push('|---|---|---|---|---|');
  for (const s of vitals.signos) {
    l.push(`| ${s.nombre} | \`${barra(s.valor)}\` ${s.valor.toFixed(2)} | ${s.peso} | ${s.ok ? 'OK' : 'ATENCION'} | ${s.nota} |`);
  }
  l.push('');
  if (regresiones.length) {
    l.push('## ⚠️ Regresiones desde el latido anterior');
    l.push('');
    for (const r of regresiones) l.push(`- ${r}`);
    l.push('');
  }
  if (vitals.razones.length) {
    l.push('## Signos fuera de rango');
    l.push('');
    for (const r of vitals.razones) l.push(`- ${r}`);
    l.push('');
  }
  l.push('## Decision autonoma');
  l.push('');
  l.push(`- **Modo**: \`${accion.modo}\` (${accion.prioridad})`);
  l.push(`- **Objetivo**: ${accion.objetivo}`);
  l.push(`- **Por que**: ${accion.razon}`);
  if (accion.comando) l.push(`- **Siguiente comando**: \`${accion.comando}\``);
  l.push('');
  l.push('---');
  l.push('');
  l.push('_Generado por `Task/heartbeat.ts` (dominio: `packages/core/src/tools/vitals.ts`). Determinista: mismo estado -> mismo pulso._');
  return l.join('\n');
}

/** Exit code para CI: 0 verde, 1 ambar (aviso), 2 rojo (falla el job). */
export function codigoSalida(vitals: Vitals): 0 | 1 | 2 {
  return vitals.estado === 'VERDE' ? 0 : vitals.estado === 'AMBAR' ? 1 : 2;
}

export const vitals = {
  computeVitals,
  detectRegresiones,
  decidirAccion,
  construirPulso,
  aLatido,
  codigoSalida,
  UMBRALES,
  PESOS_VITALES,
};
