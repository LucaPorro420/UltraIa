---
name: orchestrator-multiagent
description: >
  Multi-agent orchestration skill for UltraIa. Coordinates multiple specialized agents
  (security, performance, architecture, releases, feedback, intelligence) in parallel
  fan-out/fan-in patterns. Implements Supervisor, Blackboard, and Cerebellum/Cerebro
  patterns. Use when: "orchestrate", "multi-agent", "coordinate agents", "parallel tasks",
  "fan-out", "blackboard", "complex routing".
---

# Orchestrator Multi-Agent

## Overview

This skill coordinates multiple specialized agents in UltraIa using proven orchestration patterns:

1. **Supervisor Pattern**: Central coordinator routes tasks to specialist agents
2. **Blackboard Pattern**: Shared knowledge space for cross-agent communication
3. **Fan-Out/Fan-In**: Parallel execution with aggregation
4. **Cerebellum/Cerebro**: Fast reflexes vs slow reasoning

## Agent Fleet

| Agent | Role | Capabilities |
|-------|------|-------------|
| `bp-seguridad` | Security Auditor | security, deps, codequality |
| `bp-performance` | Performance Optimizer | perf-optimizer, tech-debt |
| `bp-arquitecto` | Architecture Decision | tech-debt, diagram, complexity-router |
| `bp-releases` | Release Manager | release-manager, security, batch-executor |
| `bp-feedback` | Feedback Analyzer | feedback-analyzer, growth, topics |
| `bp-inteligencia` | Competitive Intel | competitive-intel, research, topics |
| `bp-orquestador` | Master Orchestrator | all capabilities |
| `bp-investigador` | Research Agent | web, semantic_memory, studio |
| `bp-analista` | Analysis Agent | web, videoqa, semantic_memory |

## Orchestration Patterns

### 1. Parallel Security + Performance Audit
```
Orchestrator → [bp-seguridad, bp-performance, bp-arquitecto] → blackboard → report
```

### 2. Release Pipeline
```
bp-releases → [security check, lint check, build check, test check] → changelog → approve/reject
```

### 3. Feedback-Driven Development
```
bp-feedback → [analyze, cluster, prioritize] → blackboard → bp-arquitecto → ADR
```

### 4. Competitive Intelligence Pipeline
```
bp-inteligencia → [research trends, update competitors, SWOT] → blackboard → bp-feedback
```

### 5. Complexity-Based Routing
```
User Query → complexity-router → {reflex: fast path, deliberate: single agent, meta: multi-agent}
```

## Blackboard Protocol

All agents write findings to the blackboard with:
- **type**: finding | hypothesis | solution | metric | lesson | task
- **confidence**: 0-1 (how sure the agent is)
- **tags**: searchable labels
- **dependsOn**: IDs of entries this builds upon

Agents READ from blackboard to:
- Avoid redundant work
- Build on other agents' findings
- Get cross-cutting context

## Execution Flow

1. **Classify** incoming request with complexity-router
2. **Route** to appropriate agent(s) based on tier
3. **Execute** in parallel when possible (batch-executor)
4. **Write** results to blackboard
5. **Aggregate** findings across agents
6. **Report** unified results

## Commands

- `orchestrate security audit` → Run all security checks in parallel
- `orchestrate release readiness` → Check all release criteria
- `orchestrate feedback analysis` → Analyze and cluster feedback
- `orchestrate competitive update` → Update all competitor profiles
- `orchestrate full pipeline` → Run all agents in optimal order
