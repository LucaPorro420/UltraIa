/**
 * Model Orchestrator — automatic model/mode switching for UltraIa
 *
 * Classifies tasks, selects the optimal model from available providers
 * (OrcaRouter + OpenRouter), manages fallback chains, rate limits,
 * and cost tracking. Designed to work with model-memory.ts for
 * context continuity across switches.
 *
 * Providers configured in opencode.json:
 *   orca:       OrcaRouter (https://api.orcarouter.ai/v1)
 *   openrouter: OpenRouter  (https://openrouter.ai/api/v1)
 */

import { z } from 'zod';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type TaskKind =
  | 'code'        // coding, debugging, refactoring
  | 'reasoning'   // complex analysis, math, logic
  | 'creative'    // writing, brainstorming, copy
  | 'fast'        // quick questions, triage, simple edits
  | 'vision'      // image understanding, screenshot analysis
  | 'long-context' // large documents, codebase analysis
  | 'agent';      // multi-step tool-use, autonomous loops

export type ModelTier = 'free' | 'budget' | 'premium';

export interface ModelEntry {
  id: string;               // provider/model-id format
  provider: 'orca' | 'openrouter';
  name: string;
  tier: ModelTier;
  context: number;
  output: number;
  strengths: TaskKind[];
  costPer1kInput: number;   // USD per 1K tokens (0 for free)
  costPer1kOutput: number;
  rateLimitRpm: number;     // requests per minute
  rateLimitDaily: number;   // requests per day
  visionCapable: boolean;
}

export interface OrchestratorState {
  currentModel: string;
  taskHistory: { task: TaskKind; model: string; timestamp: number; tokens: number }[];
  rateLimitCounts: Record<string, { minute: number; day: number; lastMinuteReset: number; lastDayReset: number }>;
  totalCost: number;
  sessionStarted: number;
}

export interface SwitchResult {
  previousModel: string;
  newModel: string;
  reason: string;
  contextSummary?: string;  // from memory system
}

/* ------------------------------------------------------------------ */
/*  Model Registry                                                     */
/* ------------------------------------------------------------------ */

export const MODELS: ModelEntry[] = [
  // === ORCA ROUTER — PAID (best quality) ===
  {
    id: 'orca/anthropic/claude-sonnet-4',
    provider: 'orca', name: 'Claude Sonnet 4', tier: 'premium',
    context: 200000, output: 64000,
    strengths: ['code', 'reasoning', 'agent', 'long-context'],
    costPer1kInput: 0.003, costPer1kOutput: 0.015,
    rateLimitRpm: 60, rateLimitDaily: 10000, visionCapable: false,
  },
  {
    id: 'orca/openai/gpt-5',
    provider: 'orca', name: 'GPT-5', tier: 'premium',
    context: 1000000, output: 65536,
    strengths: ['code', 'reasoning', 'creative', 'agent', 'long-context'],
    costPer1kInput: 0.0025, costPer1kOutput: 0.01,
    rateLimitRpm: 60, rateLimitDaily: 10000, visionCapable: false,
  },
  {
    id: 'orca/openai/gpt-5-mini',
    provider: 'orca', name: 'GPT-5 Mini', tier: 'budget',
    context: 1000000, output: 65536,
    strengths: ['code', 'fast', 'reasoning'],
    costPer1kInput: 0.00015, costPer1kOutput: 0.0006,
    rateLimitRpm: 120, rateLimitDaily: 10000, visionCapable: false,
  },
  {
    id: 'orca/google/gemini-2.5-pro',
    provider: 'orca', name: 'Gemini 2.5 Pro', tier: 'premium',
    context: 1000000, output: 65536,
    strengths: ['reasoning', 'long-context', 'code', 'vision'],
    costPer1kInput: 0.00125, costPer1kOutput: 0.01,
    rateLimitRpm: 60, rateLimitDaily: 10000, visionCapable: true,
  },
  {
    id: 'orca/deepseek/deepseek-chat',
    provider: 'orca', name: 'DeepSeek Chat', tier: 'budget',
    context: 128000, output: 65536,
    strengths: ['code', 'reasoning', 'creative'],
    costPer1kInput: 0.00014, costPer1kOutput: 0.00028,
    rateLimitRpm: 120, rateLimitDaily: 10000, visionCapable: false,
  },
  {
    id: 'orca/qwen/qwen3.8-max',
    provider: 'orca', name: 'Qwen 3.8 Max', tier: 'premium',
    context: 1000000, output: 131072,
    strengths: ['code', 'reasoning', 'agent', 'long-context'],
    costPer1kInput: 0.002, costPer1kOutput: 0.006,
    rateLimitRpm: 60, rateLimitDaily: 10000, visionCapable: false,
  },
  {
    id: 'orca/qwen/qwen3.7-flash',
    provider: 'orca', name: 'Qwen 3.7 Flash', tier: 'budget',
    context: 1000000, output: 65536,
    strengths: ['fast', 'code', 'creative'],
    costPer1kInput: 0.00003, costPer1kOutput: 0.00013,
    rateLimitRpm: 120, rateLimitDaily: 10000, visionCapable: false,
  },
  {
    id: 'orca/grok/grok-4-fast-reasoning',
    provider: 'orca', name: 'Grok 4 Fast', tier: 'budget',
    context: 128000, output: 65536,
    strengths: ['reasoning', 'code', 'creative'],
    costPer1kInput: 0.0003, costPer1kOutput: 0.0005,
    rateLimitRpm: 120, rateLimitDaily: 10000, visionCapable: false,
  },

  // === ORCA ROUTER — FREE ===
  {
    id: 'orca/qwen/qwen3.8-27b-free',
    provider: 'orca', name: 'Qwen 3.8 27B Free', tier: 'free',
    context: 65536, output: 65536,
    strengths: ['code', 'fast', 'reasoning'],
    costPer1kInput: 0, costPer1kOutput: 0,
    rateLimitRpm: 10, rateLimitDaily: 50, visionCapable: false,
  },
  {
    id: 'orca/deepseek/deepseek-v4-flash-free',
    provider: 'orca', name: 'DeepSeek V4 Flash Free', tier: 'free',
    context: 128000, output: 65536,
    strengths: ['fast', 'code', 'creative'],
    costPer1kInput: 0, costPer1kOutput: 0,
    rateLimitRpm: 10, rateLimitDaily: 50, visionCapable: false,
  },
  {
    id: 'orca/tencent/hy3-free',
    provider: 'orca', name: 'Tencent Hy3 Free', tier: 'free',
    context: 262144, output: 65536,
    strengths: ['reasoning', 'code', 'agent'],
    costPer1kInput: 0, costPer1kOutput: 0,
    rateLimitRpm: 10, rateLimitDaily: 50, visionCapable: false,
  },

  // === OPENROUTER — FREE ===
  {
    id: 'openrouter/openrouter/auto',
    provider: 'openrouter', name: 'OpenRouter Auto', tier: 'free',
    context: 200000, output: 32768,
    strengths: ['fast', 'code', 'reasoning', 'creative'],
    costPer1kInput: 0, costPer1kOutput: 0,
    rateLimitRpm: 20, rateLimitDaily: 1000, visionCapable: false,
  },
  {
    id: 'openrouter/nvidia/nemotron-3-ultra:free',
    provider: 'openrouter', name: 'Nemotron 3 Ultra Free', tier: 'free',
    context: 1000000, output: 32768,
    strengths: ['long-context', 'reasoning', 'agent'],
    costPer1kInput: 0, costPer1kOutput: 0,
    rateLimitRpm: 20, rateLimitDaily: 1000, visionCapable: false,
  },
  {
    id: 'openrouter/openai/gpt-oss-120b:free',
    provider: 'openrouter', name: 'GPT-OSS 120B Free', tier: 'free',
    context: 131072, output: 32768,
    strengths: ['code', 'reasoning', 'creative'],
    costPer1kInput: 0, costPer1kOutput: 0,
    rateLimitRpm: 20, rateLimitDaily: 1000, visionCapable: false,
  },
  {
    id: 'openrouter/poolside/laguna-m.1:free',
    provider: 'openrouter', name: 'Laguna M.1 Free', tier: 'free',
    context: 262144, output: 32768,
    strengths: ['code', 'agent'],
    costPer1kInput: 0, costPer1kOutput: 0,
    rateLimitRpm: 20, rateLimitDaily: 1000, visionCapable: false,
  },
  {
    id: 'openrouter/moonshot/kimi-k2.6:free',
    provider: 'openrouter', name: 'Kimi K2.6 Free', tier: 'free',
    context: 262144, output: 32768,
    strengths: ['reasoning', 'agent', 'code'],
    costPer1kInput: 0, costPer1kOutput: 0,
    rateLimitRpm: 20, rateLimitDaily: 1000, visionCapable: false,
  },
  {
    id: 'openrouter/nvidia/nemotron-nano-12b-vl:free',
    provider: 'openrouter', name: 'Nemotron Nano VL Free', tier: 'free',
    context: 128000, output: 32768,
    strengths: ['vision', 'fast'],
    costPer1kInput: 0, costPer1kOutput: 0,
    rateLimitRpm: 20, rateLimitDaily: 1000, visionCapable: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Task Classification                                               */
/* ------------------------------------------------------------------ */

const TASK_PATTERNS: { kind: TaskKind; patterns: RegExp[] }[] = [
  {
    kind: 'code',
    patterns: [
      /(?:write|create|fix|refactor|debug|implement|add|remove|change|build|make|set up|setup)\b.*\b(?:function|class|component|module|file|test|api|endpoint|route|schema|migration)/i,
      /(?:function|class|component|const|let|var|import|export|return)\s+\w+/i,
      /(?:typescript|javascript|python|rust|go|css|html|sql|prisma|react|next\.?js|tailwind|express|fastify)/i,
      /```[\s\S]{0,50}(?:function|class|const|import|export|def |async )/,
      /(?:bug|error|fallo|crash|exception|stack\s*trace|typecheck|lint|test\s+fail)/i,
      /(?:npm|yarn|pnpm|pip|cargo)\s+(?:install|run|add)/i,
      /(?:\.ts|\.tsx|\.js|\.jsx|\.py|\.rs|\.go|\.css|\.html)\b/i,
    ],
  },
  {
    kind: 'reasoning',
    patterns: [
      /(?:why|how|explain|analiz|compar|evalu|optimiz|architect|design|plan|strateg|reason|think|consider)/i,
      /(?:trade-?off|pros?\s*(?:and|y)\s*cons?|alternativas?|mejor\s*(?:enfoque|approach))/i,
      /(?:math|calculus|proof|theorem|formula|equation|algoritmo|algorithm)/i,
    ],
  },
  {
    kind: 'creative',
    patterns: [
      /(?:write|escrib|crea|genera|draft|redact|copy|blog|post|story|narrativ)/i,
      /(?:marketing|landing|email|newsletter|social\s*media|caption)/i,
      /(?:translate|traduc|localiz)/i,
    ],
  },
  {
    kind: 'vision',
    patterns: [
      /(?:screenshot|image|imagen|photo|foto|diagram|chart|graph|visual)/i,
      /(?:what(?:'s| is) (?:in|on|shown)|describe (?:this|the) (?:image|photo|screen))/i,
      /(?:look(?:s)?|se(?:e|en)|mira|observa)/i,
    ],
  },
  {
    kind: 'long-context',
    patterns: [
      /(?:entire|full|whole|complete|all)\s+(?:file|codebase|document|repo)/i,
      /(?:summarize|resum|synopsis|overview)\s+(?:this|the|el|la)/i,
      /(?:\d{4,}\s*(?:lines|tokens|words|chars))/i,
    ],
  },
  {
    kind: 'agent',
    patterns: [
      /(?:execute|ejecuta|run|corre|deploy|despliega|ship|publica)/i,
      /(?:loop|ciclo|cycle|automat|orchestrat|pipeline)/i,
      /(?:tool|herramienta|capability|skill)/i,
    ],
  },
];

export function classifyTask(input: string): TaskKind {
  const scores: Record<TaskKind, number> = {
    code: 0, reasoning: 0, creative: 0, fast: 0,
    vision: 0, 'long-context': 0, agent: 0,
  };

  for (const { kind, patterns } of TASK_PATTERNS) {
    for (const p of patterns) {
      if (p.test(input)) scores[kind] += 1;
    }
  }

  // Short inputs default to fast
  if (input.length < 50 && Object.values(scores).every(s => s === 0)) {
    return 'fast';
  }

  const best = (Object.entries(scores) as [TaskKind, number][])
    .sort((a, b) => b[1] - a[1])[0];

  return best[1] > 0 ? best[0] : 'fast';
}

/* ------------------------------------------------------------------ */
/*  Model Selection                                                    */
/* ------------------------------------------------------------------ */

export function selectModel(
  task: TaskKind,
  state: OrchestratorState,
  opts?: { preferFree?: boolean; maxCostPer1k?: number; requireVision?: boolean },
): ModelEntry {
  const candidates = MODELS.filter((m) => {
    if (opts?.requireVision && !m.visionCapable) return false;
    if (opts?.preferFree && m.tier !== 'free') return false;
    if (opts?.maxCostPer1k && m.costPer1kInput > opts.maxCostPer1k) return false;
    return m.strengths.includes(task);
  });

  // Check rate limits
  const now = Date.now();
  const available = candidates.filter((m) => {
    const rl = state.rateLimitCounts[m.id];
    if (!rl) return true;
    // Reset minute counter
    if (now - rl.lastMinuteReset > 60_000) rl.minute = 0;
    // Reset day counter
    if (now - rl.lastDayReset > 86_400_000) rl.day = 0;
    return rl.minute < m.rateLimitRpm && rl.day < m.rateLimitDaily;
  });

  if (available.length === 0) {
    // Fallback: pick the cheapest available regardless of task match
    const fallback = MODELS.find(m => m.tier === 'free') ?? MODELS[0];
    return fallback;
  }

  // Priority: premium > budget > free (unless preferFree)
  if (opts?.preferFree) {
    return available.find(m => m.tier === 'free') ?? available[0];
  }

  const ranked = available.sort((a, b) => {
    const tierOrder: Record<ModelTier, number> = { premium: 0, budget: 1, free: 2 };
    return tierOrder[a.tier] - tierOrder[b.tier];
  });

  return ranked[0];
}

/* ------------------------------------------------------------------ */
/*  Orchestrator                                                       */
/* ------------------------------------------------------------------ */

export function createOrchestrator(initialModel?: string): OrchestratorState {
  return {
    currentModel: initialModel ?? 'orca/anthropic/claude-sonnet-4',
    taskHistory: [],
    rateLimitCounts: {},
    totalCost: 0,
    sessionStarted: Date.now(),
  };
}

export function recordUsage(
  state: OrchestratorState,
  modelId: string,
  task: TaskKind,
  inputTokens: number,
  outputTokens: number,
): void {
  const model = MODELS.find(m => m.id === modelId);
  if (!model) return;

  // Track rate limits
  const now = Date.now();
  if (!state.rateLimitCounts[modelId]) {
    state.rateLimitCounts[modelId] = { minute: 0, day: 0, lastMinuteReset: now, lastDayReset: now };
  }
  const rl = state.rateLimitCounts[modelId];
  if (now - rl.lastMinuteReset > 60_000) { rl.minute = 0; rl.lastMinuteReset = now; }
  if (now - rl.lastDayReset > 86_400_000) { rl.day = 0; rl.lastDayReset = now; }
  rl.minute += 1;
  rl.day += 1;

  // Track cost
  state.totalCost += (inputTokens / 1000) * model.costPer1kInput + (outputTokens / 1000) * model.costPer1kOutput;

  // Track history
  state.taskHistory.push({ task, model: modelId, timestamp: now, tokens: inputTokens + outputTokens });
}

export function shouldSwitchModel(
  state: OrchestratorState,
  newTask: TaskKind,
): { shouldSwitch: boolean; reason: string } {
  const currentModel = MODELS.find(m => m.id === state.currentModel);
  if (!currentModel) return { shouldSwitch: true, reason: 'current model not found' };

  // Check if current model supports the new task
  if (!currentModel.strengths.includes(newTask)) {
    return { shouldSwitch: true, reason: `current model lacks ${newTask} strength` };
  }

  // Check rate limits
  const rl = state.rateLimitCounts[state.currentModel];
  if (rl) {
    const now = Date.now();
    if (now - rl.lastMinuteReset > 60_000) rl.minute = 0;
    if (rl.minute >= currentModel.rateLimitRpm) {
      return { shouldSwitch: true, reason: 'rate limit reached (RPM)' };
    }
    if (rl.day >= currentModel.rateLimitDaily) {
      return { shouldSwitch: true, reason: 'daily rate limit reached' };
    }
  }

  // Check if a better free model exists for this task
  const betterFree = MODELS.find(m =>
    m.tier === 'free' &&
    m.strengths.includes(newTask) &&
    m.context >= currentModel.context
  );
  if (betterFree && currentModel.tier !== 'free') {
    // Only switch to free if budget is a concern (heuristic: >$1 spent)
    if (state.totalCost > 1.0) {
      return { shouldSwitch: true, reason: 'switching to free tier to save cost' };
    }
  }

  return { shouldSwitch: false, reason: 'current model is suitable' };
}

export function switchModel(
  state: OrchestratorState,
  newTask: TaskKind,
  opts?: { preferFree?: boolean },
): SwitchResult {
  const previous = state.currentModel;
  const newModel = selectModel(newTask, state, opts);
  state.currentModel = newModel.id;

  return {
    previousModel: previous,
    newModel: newModel.id,
    reason: `task=${newTask}, selected ${newModel.name} (${newModel.tier})`,
  };
}

/* ------------------------------------------------------------------ */
/*  Fallback Chains                                                    */
/* ------------------------------------------------------------------ */

export const FALLBACK_CHAINS: Record<TaskKind, string[]> = {
  code: [
    'orca/anthropic/claude-sonnet-4',
    'orca/qwen/qwen3.8-max',
    'orca/openai/gpt-5',
    'orca/deepseek/deepseek-chat',
    'openrouter/openai/gpt-oss-120b:free',
    'openrouter/poolside/laguna-m.1:free',
    'orca/qwen/qwen3.8-27b-free',
  ],
  reasoning: [
    'orca/google/gemini-2.5-pro',
    'orca/openai/gpt-5',
    'orca/qwen/qwen3.8-max',
    'orca/grok/grok-4-fast-reasoning',
    'openrouter/moonshot/kimi-k2.6:free',
    'openrouter/nvidia/nemotron-3-ultra:free',
    'orca/tencent/hy3-free',
  ],
  creative: [
    'orca/openai/gpt-5',
    'orca/anthropic/claude-sonnet-4',
    'orca/grok/grok-4-fast-reasoning',
    'orca/deepseek/deepseek-chat',
    'openrouter/openai/gpt-oss-120b:free',
    'orca/deepseek/deepseek-v4-flash-free',
  ],
  fast: [
    'orca/qwen/qwen3.7-flash',
    'orca/openai/gpt-5-mini',
    'orca/deepseek/deepseek-chat',
    'orca/qwen/qwen3.8-27b-free',
    'openrouter/openrouter/auto',
    'orca/deepseek/deepseek-v4-flash-free',
  ],
  vision: [
    'orca/google/gemini-2.5-pro',
    'openrouter/nvidia/nemotron-nano-12b-vl:free',
  ],
  'long-context': [
    'orca/openai/gpt-5',
    'orca/qwen/qwen3.8-max',
    'orca/google/gemini-2.5-pro',
    'openrouter/nvidia/nemotron-3-ultra:free',
    'orca/tencent/hy3-free',
  ],
  agent: [
    'orca/anthropic/claude-sonnet-4',
    'orca/qwen/qwen3.8-max',
    'orca/openai/gpt-5',
    'orca/grok/grok-4-fast-reasoning',
    'openrouter/moonshot/kimi-k2.6:free',
    'orca/qwen/qwen3.8-27b-free',
  ],
};

export function getNextFallback(
  task: TaskKind,
  failedModelId: string,
): string | null {
  const chain = FALLBACK_CHAINS[task];
  const idx = chain.indexOf(failedModelId);
  if (idx === -1 || idx === chain.length - 1) return null;
  return chain[idx + 1];
}
