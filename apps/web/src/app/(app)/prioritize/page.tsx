'use client';

import { useState } from 'react';

/* Tipos locales (no importamos core en cliente para no arrastrar codigo de servidor). */
type Level = 'A' | 'B' | 'C' | 'D';
interface ScoredExperiment {
  id: string;
  objective: string;
  score: number;
  level: Level;
  factors: {
    impact: number;
    confidence: number;
    learningValue: number;
    urgency: number;
    computeCost: number;
  };
}
interface Rule {
  id: string;
  description: string;
  confidence: number;
  impact: number;
}
interface ModuleBottleneck {
  module: string;
  impactGlobal: number;
}
interface PrioritizeResult {
  analyzedRules: number;
  weakRules: Rule[];
  bottlenecks: ModuleBottleneck[];
  ranked: ScoredExperiment[];
  best: ScoredExperiment | null;
  libraryUpdate: {
    rules: number;
    weakRules: number;
    bottlenecks: number;
    topExperimentId: string | null;
  };
}

interface Row {
  name: string;
  impact: number;
  confidence: number;
  learningValue: number;
  urgency: number;
  computeCost: number;
  notes: string;
}

const EMPTY: Row = {
  name: '',
  impact: 0.7,
  confidence: 0.7,
  learningValue: 0.5,
  urgency: 0.6,
  computeCost: 0.3,
  notes: '',
};

const EXAMPLE: Row[] = [
  { name: 'Video corto paisajes (viajes)', impact: 0.9, confidence: 0.8, learningValue: 0.4, urgency: 0.7, computeCost: 0.3, notes: 'Alto alcance, bajo costo' },
  { name: 'Taller de prompts para negocios', impact: 0.7, confidence: 0.85, learningValue: 0.6, urgency: 0.5, computeCost: 0.4, notes: 'Construye autoridad' },
  { name: 'Experimento A/B thumbnails', impact: 0.6, confidence: 0.7, learningValue: 0.8, urgency: 0.4, computeCost: 0.2, notes: 'Aprendizaje alto' },
  { name: 'Serie educativa IA (profunda)', impact: 0.8, confidence: 0.5, learningValue: 0.9, urgency: 0.3, computeCost: 0.6, notes: 'Costoso pero diferenciador' },
];

const LEVEL_STYLES: Record<Level, string> = {
  A: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  B: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  C: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  D: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
};

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-neutral-400">
      {label}
      <input
        type="number"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-border-subtle bg-canvas px-2 py-1 text-sm text-neutral-100 outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

export default function PrioritizePage() {
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY }]);
  const [rulesJson, setRulesJson] = useState('');
  const [bottlenecksJson, setBottlenecksJson] = useState('');
  const [result, setResult] = useState<PrioritizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const run = async () => {
    setError(null);
    setLoading(true);
    try {
      let rules: unknown[] = [];
      let bottlenecks: unknown[] = [];
      if (rulesJson.trim()) rules = JSON.parse(rulesJson);
      if (bottlenecksJson.trim()) bottlenecks = JSON.parse(bottlenecksJson);
      const res = await fetch('/api/prioritize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ experiments: rows, rules, bottlenecks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Error al priorizar');
      setResult(data as PrioritizeResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-50">Priorizar</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Motor de priorizacion estilo Meta-IA: puntua experimentos por impacto, confianza, aprendizaje,
          urgencia y costo; detecta reglas debiles y cuellos de botella, y rankea el ecosistema.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-panel">
        <div className="border-b border-border-subtle px-4 py-3 text-sm font-medium text-neutral-200">
          Experimentos
        </div>
        <div className="space-y-3 p-4">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-1 gap-3 rounded-lg border border-border-subtle bg-canvas/40 p-3 md:grid-cols-7">
              <label className="flex flex-col gap-1 text-[11px] text-neutral-400 md:col-span-2">
                Nombre
                <input
                  value={r.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="Experimento"
                  className="w-full rounded-md border border-border-subtle bg-canvas px-2 py-1 text-sm text-neutral-100 outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
              <NumField label="Impacto" value={r.impact} onChange={(v) => update(i, { impact: v })} />
              <NumField label="Confianza" value={r.confidence} onChange={(v) => update(i, { confidence: v })} />
              <NumField label="Aprendizaje" value={r.learningValue} onChange={(v) => update(i, { learningValue: v })} />
              <NumField label="Urgencia" value={r.urgency} onChange={(v) => update(i, { urgency: v })} />
              <NumField label="Costo" value={r.computeCost} onChange={(v) => update(i, { computeCost: v })} />
              <label className="flex flex-col gap-1 text-[11px] text-neutral-400 md:col-span-7">
                Notas
                <input
                  value={r.notes}
                  onChange={(e) => update(i, { notes: e.target.value })}
                  className="w-full rounded-md border border-border-subtle bg-canvas px-2 py-1 text-sm text-neutral-100 outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
              <button
                onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                className="text-xs text-rose-300 hover:text-rose-200 md:col-span-7"
              >
                Quitar fila
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border-subtle px-4 py-3">
          <button
            onClick={() => setRows((rs) => [...rs, { ...EMPTY }])}
            className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-neutral-200 hover:bg-panel-hover"
          >
            + Agregar fila
          </button>
          <button
            onClick={() => setRows(EXAMPLE)}
            className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-neutral-200 hover:bg-panel-hover"
          >
            Cargar ejemplo
          </button>
          <button
            onClick={run}
            disabled={loading}
            className="ml-auto rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white shadow-[0_0_18px_-8px_rgba(139,92,246,0.8)] hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Calculando…' : 'Ejecutar priorizacion'}
          </button>
        </div>
      </div>

      <details className="mt-4 rounded-xl border border-border-subtle bg-panel px-4 py-3 text-sm">
        <summary className="cursor-pointer text-neutral-300">Opcional: reglas y cuellos de botella (JSON)</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-[11px] text-neutral-400">
            Reglas (ej: [{'{'} &quot;id&quot;:&quot;r1&quot;,&quot;description&quot;:&quot;regla debil&quot;,&quot;confidence&quot;:0.3,&quot;impact&quot;:0.8 {'}'}])
            <textarea
              value={rulesJson}
              onChange={(e) => setRulesJson(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-border-subtle bg-canvas px-2 py-1 font-mono text-xs text-neutral-100 outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-neutral-400">
            Cuellos de botella (ej: [{'{'} &quot;module&quot;:&quot;auth&quot;,&quot;impactGlobal&quot;:0.7 {'}'}])
            <textarea
              value={bottlenecksJson}
              onChange={(e) => setBottlenecksJson(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-border-subtle bg-canvas px-2 py-1 font-mono text-xs text-neutral-100 outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>
      </details>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {result && (
        <section className="mt-6 space-y-6">
          <div className="rounded-xl border border-border-subtle bg-panel">
            <div className="border-b border-border-subtle px-4 py-3 text-sm font-medium text-neutral-200">
              Ranking priorizado
            </div>
            <div className="divide-y divide-border-subtle">
              {[...result.ranked].map((e, i) => (
                <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="w-6 shrink-0 pt-1 text-center text-sm font-semibold text-neutral-400">
                    {i + 1}
                  </div>
                  <span
                    className={`mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ring-1 ${LEVEL_STYLES[e.level]}`}
                  >
                    {e.level}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-neutral-100">{e.objective}</p>
                      <span className="shrink-0 font-mono text-xs text-neutral-400">
                        score {e.score.toFixed(3)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.round(Math.max(0, Math.min(1, e.score)) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      I {e.factors.impact.toFixed(2)} · C {e.factors.confidence.toFixed(2)} · L{' '}
                      {e.factors.learningValue.toFixed(2)} · U {e.factors.urgency.toFixed(2)} · $ Costo{' '}
                      {e.factors.computeCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {result.best && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
              <span className="font-medium text-neutral-200">Mejor experimento: </span>
              <span className="text-neutral-100">{result.best.objective}</span>
              <span className="ml-2 font-mono text-xs text-neutral-400">
                (score {result.best.score.toFixed(3)}, nivel {result.best.level})
              </span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border-subtle bg-panel p-4">
              <h3 className="mb-2 text-sm font-medium text-neutral-200">
                Reglas debiles ({result.weakRules.length})
              </h3>
              {result.weakRules.length === 0 ? (
                <p className="text-xs text-neutral-500">Ninguna (no se enviaron reglas o todas sanas).</p>
              ) : (
                <ul className="space-y-1 text-xs text-neutral-400">
                  {result.weakRules.map((r) => (
                    <li key={r.id} className="text-rose-300">
                      {r.id} — {r.description || '(sin descripcion)'} · conf {r.confidence.toFixed(2)} · imp{' '}
                      {r.impact.toFixed(2)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-border-subtle bg-panel p-4">
              <h3 className="mb-2 text-sm font-medium text-neutral-200">
                Cuellos de botella ({result.bottlenecks.length})
              </h3>
              {result.bottlenecks.length === 0 ? (
                <p className="text-xs text-neutral-500">Ninguno (no se enviaron modulos).</p>
              ) : (
                <ul className="space-y-1 text-xs text-neutral-400">
                  {[...result.bottlenecks]
                    .sort((a, b) => b.impactGlobal - a.impactGlobal)
                    .map((b) => (
                      <li key={b.module} className="text-amber-300">
                        {b.module} — impacto global {b.impactGlobal.toFixed(2)}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border-subtle bg-panel p-4 text-xs text-neutral-400">
            <span className="font-medium text-neutral-200">Actualizacion de biblioteca: </span>
            reglas analizadas {result.libraryUpdate.rules} · debiles {result.libraryUpdate.weakRules} · cuellos{' '}
            {result.libraryUpdate.bottlenecks} · top {result.libraryUpdate.topExperimentId ?? '—'}
          </div>
        </section>
      )}
    </div>
  );
}
