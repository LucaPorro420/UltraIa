/**
 * POST /api/bridge/message — Chat-to-Code Bridge endpoint.
 *
 * Recibe un mensaje de chat (de VS Code, Discord, Telegram o web),
 * lo routea al agente correcto, genera edits de archivo, ejecuta
 * gates y hace commit o rollback automáticamente.
 *
 * Auth: requiere usuario logueado.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/context';
import {
  validateBridgeInput,
  executeBridge,
  selectAgent,
  resolveModel,
  type FileEdit,
  type BridgeResult,
} from '@ultraia/core';
import { generateText } from 'ai';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROOT = path.resolve(process.cwd(), '..', '..');

/* ------------------------------------------------------------------ */
/* Security helpers                                                     */
/* ------------------------------------------------------------------ */

/** Assert that a file path stays within the workspace root (C04/M09 path traversal guard). */
function assertInsideWorkspace(filePath: string, workspaceRoot: string): void {
  const resolved = path.resolve(workspaceRoot, filePath);
  const root = path.resolve(workspaceRoot);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(`Path traversal blocked: ${filePath}`);
  }
}

/* ------------------------------------------------------------------ */
/* Dependency implementations (real filesystem + git)                   */
/* ------------------------------------------------------------------ */

/**
 * Genera edits dado un mensaje usando el LLM.
 * El agente seleccionado provee el system prompt; el LLM responde con JSON
 * que se parsea como FileEdit[]. Si el LLM no produce edits, retorna [].
 */
async function generateEdits(
  message: string,
  opts: { agentId?: string; userId: string },
): Promise<FileEdit[]> {
  const agent = selectAgent(message, opts.agentId);

  const system = `You are a code assistant embedded in the UltraIa bridge.
The user sends a message describing a code change they want.
Analyze the message and produce file edits as a JSON array.

Rules:
- Each edit: { "file": "relative/path", "action": "create"|"update"|"delete", "content"?: "string" }
- For "update", include "startLine" and "endLine" (1-indexed, inclusive) for partial edits, or omit for full-file replace.
- Only produce edits if the message clearly describes a code change.
- If the message is a question or doesn't require code changes, return an empty array: []
- Paths must be relative to the project root (e.g. "packages/core/src/tools/foo.ts").
- Never edit .env, auth/, payments/, secrets/, or node_modules/.
- Respond ONLY with the JSON array, no markdown, no explanation.`;

  try {
    const { text } = await generateText({
      model: resolveModel(),
      system,
      prompt: message,
      maxTokens: 4096,
    });

    // Parse JSON array from LLM response (strip markdown fences if present)
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) return [];

    // Validate each edit has required fields
    return parsed.filter((e): e is FileEdit =>
      typeof e === 'object' &&
      e !== null &&
      typeof e.file === 'string' &&
      ['create', 'update', 'delete'].includes(e.action) &&
      (e.action !== 'delete' ? typeof e.content === 'string' && e.content.length > 0 : true)
    );
  } catch {
    // LLM unavailable, invalid JSON, or parse error — return empty (fail-soft)
    return [];
  }
}

/**
 * Aplica un edit al filesystem.
 */
async function applyEdit(edit: FileEdit, workspaceRoot: string): Promise<void> {
  assertInsideWorkspace(edit.file, workspaceRoot); // C04: path traversal guard
  const filePath = path.join(workspaceRoot, edit.file);

  switch (edit.action) {
    case 'create':
    case 'update': {
      if (!edit.content) throw new Error(`No content for ${edit.action} on ${edit.file}`);
      const dir = path.dirname(filePath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      await writeFile(filePath, edit.content, 'utf-8');
      break;
    }
    case 'delete': {
      const { unlink } = await import('node:fs/promises');
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
      break;
    }
  }
}

/**
 * Ejecuta los gates del proyecto.
 */
async function runGates(workspaceRoot: string): Promise<{ typecheck: boolean; lint: boolean; test: boolean }> {
  const run = async (cmd: string, args: string[]): Promise<boolean> => {
    try {
      await execFileAsync(cmd, args, {
        cwd: workspaceRoot,
        timeout: 120_000,
        encoding: 'utf-8',
      });
      return true;
    } catch {
      return false;
    }
  };

  const [typecheck, lint, test] = await Promise.all([
    run('npm', ['run', 'typecheck']),
    run('npm', ['run', 'lint']),
    run('npm', ['run', 'test']),
  ]);

  return { typecheck, lint, test };
}

/**
 * Crea un commit con los archivos especificados.
 */
async function createCommit(
  message: string,
  files: string[],
  workspaceRoot: string,
): Promise<void> {
  if (files.length === 0) return;

  // M09: validate all file paths stay within workspace
  for (const f of files) assertInsideWorkspace(f, workspaceRoot);

  // git add files
  await execFileAsync('git', ['add', ...files], {
    cwd: workspaceRoot,
    encoding: 'utf-8',
  });

  // git commit
  await execFileAsync('git', ['commit', '-m', message], {
    cwd: workspaceRoot,
    encoding: 'utf-8',
  });
}

/**
 * Revierte archivos modificados usando git checkout.
 */
async function rollbackFiles(files: string[], workspaceRoot: string): Promise<void> {
  if (files.length === 0) return;

  // M09: validate all file paths stay within workspace
  for (const f of files) assertInsideWorkspace(f, workspaceRoot);

  try {
    await execFileAsync('git', ['checkout', '--', ...files], {
      cwd: workspaceRoot,
      encoding: 'utf-8',
    });
  } catch {
    // Si git checkout falla, intentar restore
    try {
      await execFileAsync('git', ['restore', ...files], {
        cwd: workspaceRoot,
        encoding: 'utf-8',
      });
    } catch {
      // Best effort
    }
  }
}

/* ------------------------------------------------------------------ */
/* Route handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  let input;
  try {
    input = validateBridgeInput({ ...(json as Record<string, unknown>), userId: user.id });
  } catch (err) {
    const message = err instanceof Error ? 'Invalid bridge input' : 'validation error';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const result = await executeBridge(input, {
    generateEdits,
    applyEdit,
    runGates,
    createCommit,
    rollbackFiles,
  });

  const status = result.status === 'error' ? 500 : 200;
  return NextResponse.json(result satisfies BridgeResult, { status });
}

/** GET: info about the bridge endpoint. */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/bridge/message',
    methods: ['POST'],
    sources: ['vscode', 'discord', 'telegram', 'web'],
    description: 'Chat-to-Code Bridge — routes messages to agents, generates code edits, runs gates',
  });
}
