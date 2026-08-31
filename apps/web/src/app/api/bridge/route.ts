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
  type FileEdit,
  type BridgeResult,
} from '@ultraia/core';
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
/* Dependency implementations (real filesystem + git)                   */
/* ------------------------------------------------------------------ */

/**
 * Genera edits dado un mensaje. En producción esto llamaría al LLM
 * con tools de file_edit/file_create. Por ahora usa un mapa simple
 * de templates para demostrar el flujo.
 */
async function generateEdits(
  message: string,
  opts: { agentId?: string; userId: string },
): Promise<FileEdit[]> {
  const agent = selectAgent(message, opts.agentId);

  // En producción: llamar al LLM con el agente seleccionado
  // y tools de file_edit/file_create/file_delete.
  // Por ahora, retornar edits vacíos (el agente decide que no hay cambios).
  // TODO: integrar con chatStream de llm.ts usando el agent
  return [];
}

/**
 * Aplica un edit al filesystem.
 */
async function applyEdit(edit: FileEdit, workspaceRoot: string): Promise<void> {
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
    const message = err instanceof Error ? err.message : 'validation error';
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
