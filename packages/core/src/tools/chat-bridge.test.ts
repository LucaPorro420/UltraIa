/**
 * Tests for chat-bridge.ts — domain pure, no real execution.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateBridgeInput,
  selectAgent,
  executeBridge,
  generateRequestId,
  type BridgeInput,
  type FileEdit,
} from './chat-bridge';

/* ------------------------------------------------------------------ */
/* validateBridgeInput                                                 */
/* ------------------------------------------------------------------ */

describe('validateBridgeInput', () => {
  it('accepts minimal valid input', () => {
    const input = validateBridgeInput({
      message: 'Add a dark mode toggle to the settings page',
      source: 'vscode',
      userId: 'user-1',
    });
    expect(input.source).toBe('vscode');
    expect(input.userId).toBe('user-1');
  });

  it('accepts all sources', () => {
    for (const source of ['vscode', 'discord', 'telegram', 'web']) {
      const input = validateBridgeInput({
        message: 'A valid message for testing purposes',
        source,
        userId: 'u1',
      });
      expect(input.source).toBe(source);
    }
  });

  it('accepts agentId', () => {
    const input = validateBridgeInput({
      message: 'Write a blog post about AI',
      source: 'web',
      agentId: 'bp-guionista',
      userId: 'u1',
    });
    expect(input.agentId).toBe('bp-guionista');
  });

  it('throws on message too short', () => {
    expect(() =>
      validateBridgeInput({ message: 'hi', source: 'vscode', userId: 'u1' }),
    ).toThrow();
  });

  it('throws on invalid source', () => {
    expect(() =>
      validateBridgeInput({ message: 'A valid message for testing', source: 'invalid', userId: 'u1' }),
    ).toThrow();
  });

  it('throws on missing userId', () => {
    expect(() =>
      validateBridgeInput({ message: 'A valid message for testing', source: 'vscode' }),
    ).toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* selectAgent                                                         */
/* ------------------------------------------------------------------ */

describe('selectAgent', () => {
  it('returns explicit agentId when provided', () => {
    expect(selectAgent('Fix the login bug', 'bp-custom')).toBe('bp-custom');
  });

  it('selects bp-guionista for script keywords', () => {
    expect(selectAgent('Escribe un guion para el video')).toBe('bp-guionista');
    expect(selectAgent('Crea un storyboard para la escena')).toBe('bp-guionista');
  });

  it('selects bp-analista for analysis keywords', () => {
    expect(selectAgent('Analiza las métricas del canal')).toBe('bp-analista');
  });

  it('selects bp-publicador for publish keywords', () => {
    expect(selectAgent('Publica esto en YouTube y TikTok')).toBe('bp-publicador');
  });

  it('defaults to bp-orquestador for ambiguous messages', () => {
    expect(selectAgent('Make it better')).toBe('bp-orquestador');
  });
});

/* ------------------------------------------------------------------ */
/* generateRequestId                                                   */
/* ------------------------------------------------------------------ */

describe('generateRequestId', () => {
  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
    expect(ids.size).toBe(100);
  });

  it('starts with bridge-', () => {
    expect(generateRequestId()).toMatch(/^bridge-/);
  });
});

/* ------------------------------------------------------------------ */
/* executeBridge                                                       */
/* ------------------------------------------------------------------ */

describe('executeBridge', () => {
  const mockGenerateEdits = vi.fn();
  const mockApplyEdit = vi.fn();
  const mockRunGates = vi.fn().mockResolvedValue({ typecheck: true, lint: true, test: true });
  const mockCreateCommit = vi.fn();
  const mockRollbackFiles = vi.fn();

  const baseInput: BridgeInput = {
    message: 'Add a dark mode toggle to the settings page',
    source: 'vscode',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations to defaults
    mockRunGates.mockResolvedValue({ typecheck: true, lint: true, test: true });
  });

  it('returns empty edits when no changes needed', async () => {
    mockGenerateEdits.mockResolvedValue([]);

    const result = await executeBridge(baseInput, {
      generateEdits: mockGenerateEdits,
      applyEdit: mockApplyEdit,
      runGates: mockRunGates,
      createCommit: mockCreateCommit,
      rollbackFiles: mockRollbackFiles,
    });

    expect(result.status).toBe('completed');
    expect(result.edits).toEqual([]);
    expect(result.summary).toContain('No code changes');
    expect(mockApplyEdit).not.toHaveBeenCalled();
  });

  it('applies edits and commits when gates GREEN', async () => {
    const edits: FileEdit[] = [
      { file: 'src/app.ts', action: 'update', content: 'export const x = 1;' },
    ];
    mockGenerateEdits.mockResolvedValue(edits);

    const result = await executeBridge(baseInput, {
      generateEdits: mockGenerateEdits,
      applyEdit: mockApplyEdit,
      runGates: mockRunGates,
      createCommit: mockCreateCommit,
      rollbackFiles: mockRollbackFiles,
    });

    expect(result.status).toBe('completed');
    expect(result.edits).toEqual(edits);
    expect(result.gates).toEqual({ typecheck: true, lint: true, test: true });
    expect(mockApplyEdit).toHaveBeenCalledOnce();
    expect(mockCreateCommit).toHaveBeenCalledOnce();
    expect(mockRollbackFiles).not.toHaveBeenCalled();
    expect(result.filesChanged).toEqual(['src/app.ts']);
  });

  it('rolls back when gates RED', async () => {
    const edits: FileEdit[] = [
      { file: 'src/app.ts', action: 'update', content: 'export const x = 1;' },
    ];
    mockGenerateEdits.mockResolvedValue(edits);
    mockRunGates.mockResolvedValue({ typecheck: false, lint: true, test: true });

    const result = await executeBridge(baseInput, {
      generateEdits: mockGenerateEdits,
      applyEdit: mockApplyEdit,
      runGates: mockRunGates,
      createCommit: mockCreateCommit,
      rollbackFiles: mockRollbackFiles,
    });

    expect(result.status).toBe('rolled_back');
    expect(result.error).toContain('typecheck');
    expect(mockRollbackFiles).toHaveBeenCalledOnce();
    expect(mockCreateCommit).not.toHaveBeenCalled();
    expect(result.filesChanged).toEqual([]);
  });

  it('handles generation errors', async () => {
    mockGenerateEdits.mockRejectedValue(new Error('LLM failed'));

    const result = await executeBridge(baseInput, {
      generateEdits: mockGenerateEdits,
      applyEdit: mockApplyEdit,
      runGates: mockRunGates,
      createCommit: mockCreateCommit,
      rollbackFiles: mockRollbackFiles,
    });

    expect(result.status).toBe('error');
    expect(result.error).toBe('LLM failed');
  });

  it('generates unique requestIds', async () => {
    mockGenerateEdits.mockResolvedValue([]);
    const r1 = await executeBridge(baseInput, {
      generateEdits: mockGenerateEdits,
      applyEdit: mockApplyEdit,
      runGates: mockRunGates,
      createCommit: mockCreateCommit,
      rollbackFiles: mockRollbackFiles,
    });
    const r2 = await executeBridge(baseInput, {
      generateEdits: mockGenerateEdits,
      applyEdit: mockApplyEdit,
      runGates: mockRunGates,
      createCommit: mockCreateCommit,
      rollbackFiles: mockRollbackFiles,
    });

    expect(r1.requestId).not.toBe(r2.requestId);
  });

  it('applies multiple edits in order', async () => {
    const edits: FileEdit[] = [
      { file: 'src/a.ts', action: 'create', content: 'export const a = 1;' },
      { file: 'src/b.ts', action: 'update', content: 'export const b = 2;' },
      { file: 'src/c.ts', action: 'delete' },
    ];
    mockGenerateEdits.mockResolvedValue(edits);

    const result = await executeBridge(baseInput, {
      generateEdits: mockGenerateEdits,
      applyEdit: mockApplyEdit,
      runGates: mockRunGates,
      createCommit: mockCreateCommit,
      rollbackFiles: mockRollbackFiles,
    });

    expect(result.status).toBe('completed');
    expect(mockApplyEdit).toHaveBeenCalledTimes(3);
    expect(result.filesChanged).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
  });
});
