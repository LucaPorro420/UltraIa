/**
 * orchestrator/index.ts — Export all orchestrator modules
 *
 * Local autonomous development system using Ollama models.
 * No API keys, no tokens, no cost.
 */

export { OllamaRouter, createOllamaRouter, getDefaultRouter } from '../adapters/ollama-router';
export type {
  TaskType,
  ModelConfig,
  GenerateOptions,
  GenerateResult,
  OllamaHealthResult,
} from '../adapters/ollama-router';

export {
  PlannerOrchestrator,
  CoderOrchestrator,
  VerifierOrchestrator,
  createPlanner,
  createCoder,
  createVerifier,
} from './specialized';
export type {
  TaskStatus,
  Task,
  PlanStep,
  Plan,
  CodeResult,
  TestResult,
  OrchestratorResult,
} from './specialized';

export {
  SharedMemory,
  createSharedMemory,
  getDefaultMemory,
} from './memory';
export type {
  MemoryType,
  MemoryEntry,
  MemoryQuery,
  MemoryStats,
} from './memory';

export {
  Coordinator,
  createCoordinator,
} from './coordinator';
export type {
  CoordinatorStatus,
  CoordinatorConfig,
  StepResult,
  CommitResult,
  RunResult,
} from './coordinator';
