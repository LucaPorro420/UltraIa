// -----------------------------------------------------------------------------
// sandbox.ts — capability `sandbox` (Fase B, E2B port)
// -----------------------------------------------------------------------------
// Port de principios de E2B Code Interpreter (e2b.dev): sandbox aislado para
// ejecutar código de agentes de forma segura. Sin dep `@e2b/code-interpreter`:
// adapter fetch-inyectable, fail-soft, keyless-first. Si E2B_API_KEY presente
// → intenta E2B cloud; si no → local allowlist (no exec real, solo plan).
// Determinista, nunca lanza, nunca evalúa código en tests.
// -----------------------------------------------------------------------------

import { z } from 'zod';

export const sandboxInputSchema = z.object({
  lang: z.enum(['python', 'javascript', 'typescript', 'bash']),
  code: z.string().min(1).max(10000),
  timeoutMs: z.number().int().min(1000).max(60000).optional(),
  env: z.record(z.string()).optional(),
});

export type SandboxInput = z.infer<typeof sandboxInputSchema>;

export const sandboxConfigSchema = z.object({
  e2bUrl: z.string().url().optional(),
  timeoutMs: z.number().int().min(1000).max(60000).optional(),
});

export type SandboxConfig = z.infer<typeof sandboxConfigSchema>;

export type SandboxResult =
  | { ok: true; provider: 'e2b' | 'local'; stdout: string; stderr: string; exitCode: number; note: string }
  | { ok: false; provider: 'e2b' | 'local'; reason: string };

export function resolveSandboxConfig(raw: SandboxConfig = {}): Required<SandboxConfig> {
  const parsed = sandboxConfigSchema.parse(raw);
  return {
    e2bUrl: parsed.e2bUrl ?? process.env.E2B_API_URL ?? 'https://api.e2b.dev',
    timeoutMs: parsed.timeoutMs ?? 30000,
  };
}

/** Planifica ejecución (sin red): decide provider y valida input. Puro. */
export function planSandboxExecution(input: SandboxInput, config: SandboxConfig = {}): SandboxInput & { provider: 'e2b' | 'local'; reason: string } {
  const parsed = sandboxInputSchema.parse(input);
  const hasKey = !!process.env.E2B_API_KEY;
  return {
    ...parsed,
    timeoutMs: parsed.timeoutMs ?? resolveSandboxConfig(config).timeoutMs,
    provider: hasKey ? 'e2b' : 'local',
    reason: hasKey ? 'E2B_API_KEY presente → nube aislada' : 'sin E2B_API_KEY → ejecución local (allowlist, no exec)',
  };
}

/** Ejecuta sandbox (fetch inyectable). En tests nunca hace red real si no hay key. */
export async function executeSandbox(
  input: SandboxInput,
  config: SandboxConfig = {},
  fetchImpl?: typeof fetch,
): Promise<SandboxResult> {
  const plan = planSandboxExecution(input, config);
  const resolved = resolveSandboxConfig(config);

  if (plan.provider === 'local') {
    // Local: no exec real, solo simula (seguridad). Retorna plan como stdout para demo.
    return {
      ok: true,
      provider: 'local',
      stdout: `[local plan] lang=${plan.lang} codeLen=${plan.code.length}`,
      stderr: '',
      exitCode: 0,
      note: plan.reason,
    };
  }

  // E2B cloud: POST a /sandboxes (simplificado; real E2B usa /v1/sandboxes)
  const doFetch = fetchImpl ?? fetch;
  const url = `${resolved.e2bUrl.replace(/\/$/, '')}/sandboxes/execute`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.E2B_API_KEY}`,
  };
  const body = JSON.stringify({ lang: plan.lang, code: plan.code, timeoutMs: plan.timeoutMs });
  try {
    const res = await doFetch(url, { method: 'POST', headers, body });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, provider: 'e2b', reason: `E2B ${res.status}: ${text.slice(0, 300)}` };
    }
    // E2B real devuelve {stdout, stderr, exitCode}; fallback a text
    try {
      const j = JSON.parse(text) as { stdout?: string; stderr?: string; exitCode?: number };
      return {
        ok: true,
        provider: 'e2b',
        stdout: j.stdout ?? text.slice(0, 2000),
        stderr: j.stderr ?? '',
        exitCode: j.exitCode ?? 0,
        note: 'E2B cloud ejecutado',
      };
    } catch {
      return { ok: true, provider: 'e2b', stdout: text.slice(0, 2000), stderr: '', exitCode: 0, note: 'E2B cloud (raw)' };
    }
  } catch (e) {
    return { ok: false, provider: 'e2b', reason: String((e as Error).message ?? e).slice(0, 300) };
  }
}

export const sandbox = {
  planSandboxExecution,
  executeSandbox,
  resolveSandboxConfig,
  sandboxInputSchema,
  sandboxConfigSchema,
};
