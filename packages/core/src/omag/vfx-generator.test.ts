import { describe, expect, it } from 'vitest';
import { createMediaField } from './mediafield';
import { VfxGeneratorAdapter } from './vfx-generator';

describe('VfxGeneratorAdapter (OMAG + codevfx integration)', () => {
  const baseField = createMediaField({
    environment: { scene: 'A mystical forest with glowing particles' },
  });

  it('valida: sin scene → error', async () => {
    const field = createMediaField({});
    const adapter = new VfxGeneratorAdapter();
    const errors = adapter.validate({ field, constraints: { vfxKind: 'fire' } });
    expect(errors).toContain('MediaField.environment.scene is required for VFX generation');
  });

  it('valida: vfxKind inválido → error', async () => {
    const adapter = new VfxGeneratorAdapter();
    const errors = adapter.validate({ field: baseField, constraints: { vfxKind: 'invalid-kind' } });
    expect(errors.some((e) => e.includes('Invalid vfxKind'))).toBe(true);
  });

  it('valida: fire kind válido → sin errores', async () => {
    const adapter = new VfxGeneratorAdapter();
    const errors = adapter.validate({ field: baseField, constraints: { vfxKind: 'fire', intensity: 0.8, speed: 1.2 } });
    expect(errors).toHaveLength(0);
  });

  it('generate: produce artifact con html + metadata completo', async () => {
    const adapter = new VfxGeneratorAdapter();
    const result = await adapter.generate({
      field: baseField,
      constraints: { vfxKind: 'fire', intensity: 1, speed: 1, width: 512, height: 512 },
    });
    expect(result.ok).not.toBeDefined(); // GenerationResult no tiene ok
    expect(result.confidence).toBe(0.9);
    expect(result.provenance).toContain('vfx:codevfx:fire');
    const artifact = result.artifact as { html: string; kind: string; width: number; height: number; glsl: string; palette: { base: string; accent: string; energy: string }; physics: { gravity: number; wind: number; friction: number }; particles: { count: number }; hotkey: string };
    expect(artifact.html).toContain('<!doctype html>');
    expect(artifact.kind).toBe('fire');
    expect(artifact.width).toBe(512);
    expect(artifact.height).toBe(512);
    expect(artifact.glsl).toBeTruthy();
    expect(artifact.palette).toHaveProperty('base');
    expect(artifact.physics).toHaveProperty('gravity');
    expect(artifact.particles.count).toBeGreaterThan(0);
    expect(artifact.hotkey).toBeTruthy();
    expect(result.metadata.modality).toBe('vfx');
    expect(result.metadata.kind).toBe('fire');
    expect(result.metadata.particleCount).toBe(artifact.particles.count);
  });

  it('inspect: devuelve resumen legible', async () => {
    const adapter = new VfxGeneratorAdapter();
    const result = await adapter.generate({ field: baseField, constraints: { vfxKind: 'ice' } });
    const inspection = adapter.inspect(result);
    expect(inspection.kind).toBe('ice');
    expect(inspection.dimensions).toContain('x');
    expect(typeof inspection.particles).toBe('number');
    expect(inspection.palette).toHaveProperty('base');
    expect(inspection.confidence).toBe(0.9);
  });

  it('export: data URI cuando no hay target', async () => {
    const adapter = new VfxGeneratorAdapter();
    const result = await adapter.generate({ field: baseField, constraints: { vfxKind: 'lightning' } });
    const uri = await adapter.export(result);
    expect(uri).toContain('data:text/html;base64,');
  });

  it('todos los 9 kinds generan sin error', async () => {
    const adapter = new VfxGeneratorAdapter();
    const kinds = ['fire', 'ice', 'lightning', 'meteor', 'beam', 'ground', 'void', 'plasma', 'frost'] as const;
    for (const kind of kinds) {
      const result = await adapter.generate({ field: baseField, constraints: { vfxKind: kind } });
      const artifact = result.artifact as { kind: string; html: string };
      expect(artifact.kind).toBe(kind);
      expect(artifact.html).toContain('<canvas');
    }
  });
});