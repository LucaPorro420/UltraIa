#!/usr/bin/env node
/**
 * orchestrator-local.ts — CLI runner for the local autonomous orchestrator
 *
 * Connects to a local Ollama instance and runs a task through the
 * planner → coder → verifier pipeline. No API keys, no tokens, $0 cost.
 *
 * Usage:
 *   npx vite-node scripts/orchestrator-local.ts --task "description"
 *   npx vite-node scripts/orchestrator-local.ts --task "description" --dry-run
 *   npx vite-node scripts/orchestrator-local.ts --task "description" --no-commit
 *   npx vite-node scripts/orchestrator-local.ts --health
 *
 * Requires: Ollama running on localhost:11434 with models pull:
 *   ollama pull phi3
 *   ollama pull deepseek-coder
 *   ollama pull codellama
 */

import { OllamaRouter } from '../packages/runtime/src/adapters/ollama-router';
import { Coordinator, type CoordinatorStatus } from '../packages/runtime/src/orchestrator/coordinator';
import { SharedMemory } from '../packages/runtime/src/orchestrator/memory';

/* ------------------------------------------------------------------ */
/* CLI parsing (stdlib only, no deps)                                  */
/* ------------------------------------------------------------------ */

interface CliArgs {
  task?: string;
  context?: string;
  files?: string[];
  dryRun: boolean;
  autoCommit: boolean;
  maxRetries: number;
  health: boolean;
  help: boolean;
  verbose: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    dryRun: false,
    autoCommit: true,
    maxRetries: 3,
    health: false,
    help: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--task':
      case '-t':
        result.task = args[++i];
        break;
      case '--context':
      case '-c':
        result.context = args[++i];
        break;
      case '--files':
        result.files = args[++i]?.split(',').filter(Boolean);
        break;
      case '--dry-run':
        result.dryRun = true;
        break;
      case '--no-commit':
        result.autoCommit = false;
        break;
      case '--retries':
        result.maxRetries = parseInt(args[++i] ?? '3', 10);
        break;
      case '--health':
        result.health = true;
        break;
      case '--verbose':
      case '-v':
        result.verbose = true;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
    }
  }
  return result;
}

function printHelp(): void {
  console.log(`
UltraIa Local Orchestrator — $0 autonomous development

Usage:
  npx vite-node scripts/orchestrator-local.ts --task "description" [options]

Options:
  -t, --task <desc>      Task description (required unless --health)
  -c, --context <text>   Additional context for the planner
  --files <f1,f2>        Relevant files to include in context
  --dry-run              Plan only, don't implement
  --no-commit            Skip git commit after completion
  --retries <n>          Max retries per step (default: 3)
  --health               Check Ollama health and available models
  -v, --verbose          Show detailed output
  -h, --help             Show this help

Examples:
  # Check if Ollama is running
  npx vite-node scripts/orchestrator-local.ts --health

  # Run a task
  npx vite-node scripts/orchestrator-local.ts --task "add a hello world endpoint"

  # Plan only (no implementation)
  npx vite-node scripts/orchestrator-local.ts --task "refactor auth" --dry-run

  # With context and specific files
  npx vite-node scripts/orchestrator-local.ts -t "fix login bug" -c "user reports 403" --files src/auth.ts

Models needed (pull with ollama):
  ollama pull phi3           # planning (reasoning)
  ollama pull deepseek-coder # code generation
  ollama pull codellama      # test generation & verification
`);
}

/* ------------------------------------------------------------------ */
/* Health check                                                        */
/* ------------------------------------------------------------------ */

async function checkHealth(router: OllamaRouter): Promise<void> {
  console.log('\n🔍 Checking Ollama health...\n');

  const healthy = await router.health();
  if (!healthy) {
    console.log('❌ Ollama is NOT reachable at http://localhost:11434');
    console.log('   Start it with: ollama serve');
    process.exit(1);
  }
  console.log('✅ Ollama is healthy');

  const models = ['phi3', 'deepseek-coder', 'codellama', 'llama3'];
  console.log('\n📦 Model availability:');
  for (const model of models) {
    const has = await router.hasModel(model);
    console.log(`   ${has ? '✅' : '❌'} ${model}`);
  }

  const status = router.getModelStatus();
  console.log(`\n📊 Status: ${status.totalModels} models, ${status.loadedModels} loaded`);
  if (status.totalModels > 0) {
    console.log('   Models:', status.models.map((m) => m.name).join(', '));
  }
}

/* ------------------------------------------------------------------ */
/* Status display                                                      */
/* ------------------------------------------------------------------ */

const STATUS_ICONS: Record<CoordinatorStatus, string> = {
  idle: '💤',
  planning: '📋',
  implementing: '🔨',
  verifying: '🧪',
  committing: '📦',
  completed: '✅',
  failed: '❌',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return;
  }

  // Connect to Ollama
  const router = new OllamaRouter({
    baseUrl: process.env.OLLAMA_HOST ?? 'http://localhost:11434',
    timeout: 120_000,
  });

  if (args.health) {
    await checkHealth(router);
    return;
  }

  if (!args.task) {
    console.error('Error: --task is required. Use --help for usage.');
    process.exit(1);
  }

  console.log('\n🤖 UltraIa Local Orchestrator\n');
  console.log(`📝 Task: ${args.task}`);
  if (args.context) console.log(`💡 Context: ${args.context}`);
  if (args.files?.length) console.log(`📁 Files: ${args.files.join(', ')}`);
  console.log(`🔧 Options: dryRun=${args.dryRun}, autoCommit=${args.autoCommit}, maxRetries=${args.maxRetries}`);
  console.log('');

  // Create coordinator
  const memory = new SharedMemory();
  const coordinator = new Coordinator(
    router,
    {
      maxRetries: args.maxRetries,
      autoCommit: args.autoCommit,
      dryRun: args.dryRun,
      workspacePath: process.cwd(),
    },
    memory,
  );

  // Status callback
  coordinator.onStatus((status) => {
    const icon = STATUS_ICONS[status] ?? '❓';
    console.log(`${icon} Status: ${status}`);
  });

  // Run
  const startTime = Date.now();
  console.log('🚀 Starting orchestration...\n');

  const result = await coordinator.run(args.task, {
    context: args.context,
    files: args.files,
  });

  const totalMs = Date.now() - startTime;

  // Results
  console.log('\n' + '═'.repeat(60));
  if (result.success) {
    console.log('✅ TASK COMPLETED SUCCESSFULLY');
  } else {
    console.log('❌ TASK FAILED');
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Duration: ${formatDuration(totalMs)}`);
  console.log(`   Steps: ${result.stepResults.length}`);
  console.log(
    `   Models used: ${[...new Set(result.modelUsage.map((m) => m.model))].join(', ') || 'none'}`,
  );

  if (result.commitResult?.success) {
    console.log(`   Commit: ${result.commitResult.commitHash?.slice(0, 8) ?? 'ok'}`);
    console.log(`   Files changed: ${result.commitResult.filesChanged.length}`);
  }

  if (args.verbose) {
    console.log('\n📋 Step details:');
    for (const step of result.stepResults) {
      const icon = step.success ? '✅' : '❌';
      console.log(`   ${icon} ${step.stepId} (${step.attempts} attempts)`);
      if (step.error) console.log(`      Error: ${step.error}`);
    }
  }

  console.log('');
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
