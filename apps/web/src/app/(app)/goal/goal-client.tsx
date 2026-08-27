'use client';

import { useState } from 'react';

interface TaskResult {
  task: string;
  status: 'done' | 'partial' | 'error';
  tool?: string;
  output?: unknown;
  error?: string;
}
interface GoalResult {
  goal: string;
  tasks: TaskResult[];
  done: boolean;
}

function summarize(output: unknown): string {
  if (output == null) return '';
  if (typeof output === 'string') return output.slice(0, 1200);
  try {
    const s = JSON.stringify(output);
    return s.length > 1200 ? s.slice(0, 1200) + '…' : s;
  } catch {
    return String(output).slice(0, 1200);
  }
}

const STATUS_STYLES: Record<string, string> = {
  done: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  partial: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  error: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
};

export function GoalClient() {
  const [goal, setGoal] = useState('');
  const [tasks, setTasks] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GoalResult | null>(null);

  const updateTask = (i: number, v: string) =>
    setTasks((t) => t.map((x, idx) => (idx === i ? v : x)));
  const addTask = () => setTasks((t) => [...t, '']);
  const removeTask = (i: number) => setTasks((t) => (t.length > 1 ? t.filter((_, idx) => idx !== i) : t));

  const run = async () => {
    setError(null);
    setResult(null);
    const cleaned = tasks.map((t) => t.trim()).filter(Boolean);
    if (!goal.trim() || cleaned.length === 0) {
      setError('Escribe un objetivo y al menos una tarea.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim(), tasks: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Fallo la ejecucion.');
      } else {
        setResult(data as GoalResult);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 max-w-3xl space-y-5">
      <label className="block">
        <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">objetivo global</span>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={2}
          placeholder="Ej: Lanza una campana de contenido sobre paisajes para TikTok y YouTube."
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-neutral-100 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        />
      </label>

      <div className="space-y-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">tareas</span>
        {tasks.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={t}
              onChange={(e) => updateTask(i, e.target.value)}
              placeholder={`Tarea ${i + 1} (en orden)`}
              className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-neutral-100 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            />
            <button
              type="button"
              onClick={() => removeTask(i)}
              className="rounded-lg border border-white/10 px-2 py-2 text-xs text-neutral-400 hover:text-rose-300"
              aria-label="quitar tarea"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addTask}
          className="rounded-lg border border-dashed border-white/15 px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
        >
          + agregar tarea
        </button>
      </div>

      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Ejecutando…' : 'Ejecutar /goal'}
      </button>

      {error && (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`rounded-full border px-3 py-1 text-xs ${result.done ? STATUS_STYLES.done : STATUS_STYLES.partial}`}
            >
              {result.done ? 'Completado' : 'Parcial'}
            </span>
            <span className="text-neutral-500">{result.tasks.length} tarea(s)</span>
          </div>
          {result.tasks.map((r, i) => (
            <div key={i} className={`rounded-xl border p-4 ${STATUS_STYLES[r.status] ?? STATUS_STYLES.partial}`}>
              <div className="flex items-center justify-between">
                <p className="font-medium text-neutral-100">{r.task}</p>
                <span className="font-mono text-[10px] uppercase opacity-70">{r.status}</span>
              </div>
              {r.tool && <p className="mt-1 font-mono text-[11px] text-neutral-400">tool: {r.tool}</p>}
              {r.output != null && (
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs text-neutral-200">
                  {summarize(r.output)}
                </pre>
              )}
              {r.error && <p className="mt-2 text-xs text-rose-300">{r.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
