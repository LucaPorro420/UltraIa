import { describe, expect, it } from 'vitest';

import { studio, studioCatalog, TOOL_DESCRIPTIONS, tools } from './index';
import type { Capability } from './index';

describe('studio — wiring', () => {
  it('descriptor registrado en TOOL_DESCRIPTIONS', () => {
    expect(TOOL_DESCRIPTIONS.studio).toContain('Studio media hub');
    expect(TOOL_DESCRIPTIONS.studio).toContain('keyless WAV');
  });

  it('namespace completo expuesto en tools.studio', () => {
    for (const fn of [
      'buildSavePlan',
      'slugifyPrompt',
      'assetKindFromMime',
      'compositionToSynthPlan',
      'renderCompositionWav',
      'buildDerivePlan',
      'buildSlideshowFfmpegArgv',
      'runStudioAction',
    ]) {
      const member = (studioToolsMember() as Record<string, unknown>)[fn];
      expect(['function', 'object']).toContain(typeof member);
    }
  });

  it('Capability union acepta studio y el catálogo OSS fluye end-to-end', () => {
    const caps: Capability[] = ['studio'];
    expect(caps).toContain('studio');
    const result = studio.runStudioAction({ action: 'catalog' });
    if (result.action === 'catalog') {
      expect(result.entries.length).toBeGreaterThanOrEqual(8);
      expect(result.integrityErrors).toEqual([]);
    } else {
      throw new Error('acción catalog no devolvió catálogo');
    }
    expect(studioCatalog.OSS_CATALOG.length).toBe(result.entries.length);
  });
});

function studioToolsMember(): unknown {
  return (tools as Record<string, unknown>).studio;
}
