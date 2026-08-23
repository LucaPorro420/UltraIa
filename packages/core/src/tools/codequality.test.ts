import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { cqScanText, cqScanFile, cqScanRepo, type QualityFinding } from './codequality';

describe('codequality.cqScanText', () => {
  it('detects debugger statement', () => {
    const f = cqScanText('function f(){ debugger; return 1; }');
    expect(f.some((x: QualityFinding) => x.rule === 'debugger_stmt' && x.severity === 'high')).toBe(true);
  });

  it('detects eval usage', () => {
    const f = cqScanText('const x = eval("2+2");');
    expect(f.some((x) => x.rule === 'eval_usage')).toBe(true);
  });

  it('detects new Function', () => {
    const f = cqScanText('const g = new Function("a","return a");');
    expect(f.some((x) => x.rule === 'function_constructor')).toBe(true);
  });

  it('detects alert/prompt', () => {
    const f = cqScanText('if (bad) alert("x");');
    expect(f.some((x) => x.rule === 'alert_prompt')).toBe(true);
  });

  it('detects `any` type', () => {
    const f = cqScanText('const v: any = {};');
    expect(f.some((x) => x.rule === 'ts_any')).toBe(true);
  });

  it('detects empty catch', () => {
    const f = cqScanText('try { x(); } catch (e) {}');
    expect(f.some((x) => x.rule === 'empty_catch')).toBe(true);
  });

  it('detects TODO without ticket', () => {
    const f = cqScanText('// TODO clean this up');
    expect(f.some((x) => x.rule === 'todo_no_ticket')).toBe(true);
  });

  it('does NOT flag TODO with ticket', () => {
    const f = cqScanText('// TODO #123 clean this up');
    expect(f.some((x) => x.rule === 'todo_no_ticket')).toBe(false);
  });

  it('detects hardcoded localhost', () => {
    const f = cqScanText('const u = "http://localhost:3000/api";');
    expect(f.some((x) => x.rule === 'hardcoded_localhost')).toBe(true);
  });

  it('detects console.log', () => {
    const f = cqScanText('console.log("hi");');
    expect(f.some((x) => x.rule === 'console_log')).toBe(true);
  });

  it('returns [] for clean text', () => {
    const f = cqScanText('export function add(a: number, b: number): number {\n  return a + b;\n}\n');
    expect(f).toEqual([]);
  });

  it('flags one rule per line', () => {
    const f = cqScanText('debugger;\nconsole.log("x");');
    const lines = f.map((x) => x.line).sort();
    expect(lines).toEqual([1, 2]);
  });
});

describe('codequality.cqScanRepo', () => {
  it('walks a tree and finds smells, skipping ignored dirs and binaries', () => {
    const root = mkdtempSync(join(tmpdir(), 'cq-'));
    writeFileSync(join(root, 'app.ts'), 'debugger;\n');
    mkdirSync(join(root, 'node_modules'));
    writeFileSync(join(root, 'node_modules', 'dep.js'), 'eval("1");\n');
    writeFileSync(join(root, 'note.txt'), 'debugger;\n'); // non-source ext skipped
    const f = cqScanRepo(root);
    expect(f.some((x) => x.rule === 'debugger_stmt' && x.file?.endsWith('app.ts'))).toBe(true);
    expect(f.some((x) => x.rule === 'eval_usage')).toBe(false); // node_modules skipped
    expect(f.some((x) => x.file?.endsWith('note.txt'))).toBe(false); // non-source skipped
  });
});
