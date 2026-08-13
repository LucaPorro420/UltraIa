export interface RefineAttempt {
  attempt: number;
  critique: string;
  ok: boolean;
}

export interface RefineLoopOptions<T> {
  /** Produce a candidate for the given attempt number, given prior critique. */
  generate: (attempt: number, priorCritique: string) => Promise<T>;
  /** Judge a candidate. ok=true stops the loop. */
  judge: (candidate: T, attempt: number) => Promise<{ ok: boolean; critique: string }>;
  /** Max iterations (including the first). Default 3. */
  maxIters?: number;
}

export interface RefineLoopResult<T> {
  result: T;
  attempts: number;
  history: RefineAttempt[];
  converged: boolean;
}

/**
 * Generic self-improvement loop: generate → judge → refine from critique, up to
 * maxIters times. Used to harden agent prompts, images and evaluations by
 * iterating on critique instead of generating once and hoping.
 */
export async function refineLoop<T>(opts: RefineLoopOptions<T>): Promise<RefineLoopResult<T>> {
  const maxIters = Math.max(1, opts.maxIters ?? 3);
  let priorCritique = '';
  let last: T | undefined;
  const history: RefineAttempt[] = [];

  for (let attempt = 1; attempt <= maxIters; attempt++) {
    last = await opts.generate(attempt, priorCritique);
    const verdict = await opts.judge(last, attempt);
    history.push({ attempt, critique: verdict.critique, ok: verdict.ok });
    if (verdict.ok) {
      return { result: last, attempts: attempt, history, converged: true };
    }
    priorCritique = verdict.critique;
  }

  if (last === undefined) throw new Error('refineLoop produced no candidate');
  return { result: last, attempts: maxIters, history, converged: false };
}
