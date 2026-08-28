# Model Orchestrator + Memory

Automatic model/mode switching with context continuity across model changes.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Model Orchestrator                  │
│  classifyTask → selectModel → fallback chain         │
│  rate-limit tracking · cost accounting               │
├─────────────────────────────────────────────────────┤
│                  Model Memory                        │
│  session persistence · context bridge · fact extract  │
│  turn history · markdown export                      │
├─────────────────────────────────────────────────────┤
│  Providers                                          │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐    │
│  │ OrcaRouter│  │ OpenRouter  │  │ (future: local│    │
│  │ (primary) │  │ (free tier) │  │  ollama etc.) │    │
│  └──────────┘  └────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────┘
```

## Providers

### OrcaRouter (Primary — `orca/`)
- **Base URL**: `https://api.orcarouter.ai/v1`
- **Key prefix**: `sk-orca-`
- **Free models**: `qwen/qwen3.8-27b-free`, `deepseek/deepseek-v4-flash-free`, `tencent/hy3-free`
- **Best paid**: `anthropic/claude-sonnet-4`, `openai/gpt-5`, `google/gemini-2.5-pro`

### OpenRouter (Free Tier — `openrouter/`)
- **Base URL**: `https://openrouter.ai/api/v1`
- **Key prefix**: `sk-or-v1-`
- **Free models** (all `:free` suffix):
  - `openrouter/auto` — auto-routes to best available free model
  - `nvidia/nemotron-3-ultra:free` — 1M context, reasoning/long-docs
  - `openai/gpt-oss-120b:free` — 131K, coding/reasoning
  - `poolside/laguna-m.1:free` — 262K, coding agents
  - `moonshot/kimi-k2.6:free` — 262K, reasoning/agents
  - `nvidia/nemotron-nano-12b-vl:free` — vision capable
  - `google/gemma-4-31b:free` — 262K, multilingual

## Task Classification

The orchestrator classifies user input into 7 task kinds:

| Kind | Signals | Best Models |
|------|---------|-------------|
| `code` | mentions functions, components, bugs, frameworks | Claude Sonnet 4, Qwen 3.8 Max, GPT-5 |
| `reasoning` | analysis, trade-offs, why/how, architecture | Gemini 2.5 Pro, GPT-5, Kimi K2.6 |
| `creative` | writing, marketing, translation, blog | GPT-5, Claude Sonnet 4, Grok 4 |
| `fast` | short input, simple questions | Qwen 3.7 Flash, GPT-5 Mini, Qwen 3.8 27B Free |
| `vision` | screenshots, images, "what's in this" | Gemini 2.5 Pro, Nemotron Nano VL |
| `long-context` | full files, large docs, summaries | GPT-5, Qwen 3.8 Max, Nemotron Ultra |
| `agent` | execute, deploy, pipeline, automate | Claude Sonnet 4, Qwen 3.8 Max |

## Fallback Chains

When a model fails (rate limit, error, timeout), the orchestrator walks the fallback chain:

```
code:       Sonnet 4 → Qwen Max → GPT-5 → DeepSeek Chat → GPT-OSS 120B → Laguna → Qwen Free
reasoning:  Gemini 2.5 → GPT-5 → Qwen Max → Grok 4 → Kimi → Nemotron Ultra → Hy3 Free
creative:   GPT-5 → Sonnet 4 → Grok 4 → DeepSeek → GPT-OSS 120B → DeepSeek Flash Free
fast:       Qwen Flash → GPT-5 Mini → DeepSeek → Qwen Free → OpenRouter Auto → DS Flash Free
vision:     Gemini 2.5 → Nemotron Nano VL
long-ctx:   GPT-5 → Qwen Max → Gemini 2.5 → Nemotron Ultra → Hy3 Free
agent:      Sonnet 4 → Qwen Max → GPT-5 → Grok 4 → Kimi → Qwen Free
```

## Memory System

### Session Lifecycle
```
createSession(id, model)
  ↓
addTurn(user/assistant/system, content, model, task)
  ↓ (on model switch)
prepareForSwitch(session, newModel, newTask)
  → buildContextSummary()
  → extractKeyFacts()
  → enriched prompt for new model
  ↓
resumePrompt(session)  // appends context bridge to prompt
```

### Context Bridge
When switching models, the memory system generates a compact summary:
- Last 5 user messages (most relevant)
- Accumulated key facts (files, decisions, commits, fixes)
- Decisions made during the session
- Files modified
- Previous summary (if any)

This summary is injected into the new model's system prompt so it picks up seamlessly.

### Storage
Sessions are stored in `.ultraia/memory/<sessionId>.json` (local, gitignored).

### Graphiti Compatibility
The session schema is designed to be Graphiti-compatible:
- `Turn` → Knowledge Node (fact/triple)
- `KeyFacts` → Entity Extraction
- `Decisions` → Causal Links
- `ContextBridge` → Subgraph Summary

To connect Graphiti later, implement a `GraphitiAdapter` that reads `Session` objects and writes to the Graphiti knowledge graph.

## Usage

### In OpenCode (opencode.json)
Both providers are configured. Switch models via:
- `/model orca/anthropic/claude-sonnet-4` — premium code
- `/model openrouter/nvidia/nemotron-3-ultra:free` — free long-context
- `/model orca/qwen/qwen3.8-27b-free` — free fast coding

### Programmatic (TypeScript)
```typescript
import { createOrchestrator, classifyTask, selectModel, switchModel } from '@ultraia/core/model-orchestrator';
import { createSession, addTurn, prepareForSwitch, resumePrompt } from '@ultraia/core/model-memory';

// Initialize
const state = createOrchestrator();
const session = createSession('my-session', state.currentModel);

// Classify and select
const task = classifyTask(userInput);
const model = selectModel(task, state);

// Check for switch
const { shouldSwitch } = shouldSwitchModel(state, task);
if (shouldSwitch) {
  const { enrichedPrompt } = prepareForSwitch(session, model.id, task);
  // Use enrichedPrompt as system message
}

// Record usage after response
recordUsage(state, model.id, task, inputTokens, outputTokens);
addTurn(session, { role: 'assistant', content: response, model: model.id, task });
```

## Cost Strategy

| Budget | Strategy |
|--------|----------|
| $0/day | `preferFree: true` — use OrcaRouter free + OpenRouter free |
| <$1/day | Start premium, switch to free when cost > $1 |
| Unlimited | Always pick best model for task (premium > budget > free) |

## Rate Limits

| Provider | Free RPM | Free Daily | Paid RPM | Paid Daily |
|----------|----------|------------|----------|------------|
| OrcaRouter Free | 10 | 50 | — | — |
| OrcaRouter Paid | — | — | 60-120 | 10,000 |
| OpenRouter Free | 20 | 1,000 | — | — |

## Future Enhancements

1. **Graphiti integration** — knowledge graph for long-term memory
2. **Local models** — Ollama/LMStudio as fallback (add `local` provider)
3. **Streaming context** — real-time fact extraction during streaming responses
4. **A/B model testing** — run same prompt on two models, compare quality
5. **Cost alerts** — notify when daily spend exceeds threshold
6. **Model health monitoring** — track latency, error rates per model
