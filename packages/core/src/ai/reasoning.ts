// reasoning.ts — Intent classification + reasoning context builder.
// Deterministic, keyless, zero deps.

export type IntentType = 'code' | 'creative' | 'research' | 'action' | 'analysis' | 'chat';

export interface ReasoningContext {
  intent: IntentType;
  relevantMemories: string[];
  suggestedMode: string;
  systemPromptAdditions: string[];
}

const KEYWORDS: Record<IntentType, string[]> = {
  code: ['code', 'function', 'implement', 'fix', 'bug', 'typescript', 'javascript', 'python', 'api', 'endpoint', 'test', 'error', 'refactor'],
  creative: ['create', 'design', 'generate', 'image', 'video', 'music', 'art', 'ui', 'mockup', 'story', 'animation', 'visual'],
  research: ['research', 'search', 'find', 'discover', 'paper', 'article', 'latest', 'news', 'trend', 'study', 'investigate'],
  action: ['publish', 'deploy', 'upload', 'send', 'post', 'schedule', 'automate', 'execute', 'run', 'build', 'ship'],
  analysis: ['analyze', 'review', 'audit', 'evaluate', 'measure', 'metrics', 'performance', 'benchmark', 'report', 'diagnose'],
  chat: ['hello', 'hi', 'thanks', 'help', 'explain', 'what', 'how', 'why', 'who', 'when'],
};

const MODE: Record<IntentType, string> = {
  code: 'p-b', creative: 's-d', research: 'p-p',
  action: 'build', analysis: 'review', chat: 'libre',
};

export function classifyIntent(message: string): IntentType {
  const lower = message.toLowerCase();
  let best: IntentType = 'chat';
  let score = 0;
  for (const [intent, words] of Object.entries(KEYWORDS)) {
    const s = words.filter(w => lower.includes(w)).length;
    if (s > score) { score = s; best = intent as IntentType; }
  }
  return best;
}

export function buildReasoningContext(message: string, memories: string[] = []): ReasoningContext {
  const intent = classifyIntent(message);
  return {
    intent,
    relevantMemories: memories,
    suggestedMode: MODE[intent],
    systemPromptAdditions: memories.length > 0
      ? [`## Contexto previo del usuario:\n${memories.map(m => `- ${m}`).join('\n')}`]
      : [],
  };
}
