// -----------------------------------------------------------------------------
// autopub.wiring.test.ts — contrato PUBLICO que consume el registro de la tool
// `autopub_run` en ai/llm.ts (patron qdrant-memory.wiring.test.ts): descriptor,
// namespace completo y Capability valida. El registro vive dentro de chatStream
// (no exportada); el typecheck FULL cubre ese bloque.
// -----------------------------------------------------------------------------
import { describe, expect, it } from 'vitest';

import * as autopub from './autopub';
import { tools, TOOL_DESCRIPTIONS } from './index';
import type { Capability } from './index';

describe('autopub wiring (iter-91)', () => {
  it('TOOL_DESCRIPTIONS.autopub declara las acciones plan|run', () => {
    const d = TOOL_DESCRIPTIONS.autopub;
    expect(d).toBeDefined();
    expect(d).toContain('plan');
    expect(d).toContain('run');
    expect(d).toContain('F1-F4');
  });

  it('namespace expone el contrato completo que consume llm.ts', () => {
    expect(typeof autopub.parseAutopubConfig).toBe('function');
    expect(typeof autopub.planAutopubCycle).toBe('function');
    expect(typeof autopub.defaultAutopubDeps).toBe('function');
    expect(typeof autopub.runAutopubCycle).toBe('function');
    expect(typeof autopub.resumenAutopub).toBe('function');
    expect(typeof autopub.rowToBrief).toBe('function');
    expect(typeof autopub.textoDeContenido).toBe('function');
  });

  it("'autopub' es una Capability valida y tools.autopub esta registrado", () => {
    const c: Capability = 'autopub';
    expect(c).toBe('autopub');
    expect(tools.autopub).toBeDefined();
    expect(typeof tools.autopub.runAutopubCycle).toBe('function');
  });
});
