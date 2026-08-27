// -----------------------------------------------------------------------------
// design-generator.ts — adapter OMAG para el modelo de diseño 2D/3D
// -----------------------------------------------------------------------------
// Integra `designcompose` en el orquestador OMAG como un generador más:
//   - modality 'design' (nuevo en Modality).
//   - generate() compone un diseño 2D determinista desde la escena del campo.
// Patrón de los otros adapters (image/video/audio/music/vfx): dominio puro,
// validación previa, generate → GenerationResult con el PNG como artifact.
// -----------------------------------------------------------------------------

import type { Generator, GeneratorContext, GenerationResult } from './generators';
import type { Modality } from './mediafield';
import { composeDesign2D } from '../tools/designcompose';

function seedFromScene(scene: unknown): number {
  const s = String(scene ?? 'ultraia-design');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class DesignGeneratorAdapter implements Generator {
  name = 'design-2d-3d';
  modality: Modality = 'design';

  validate(ctx: GeneratorContext): string[] {
    if (!ctx.field.environment.scene) {
      return ['MediaField.environment.scene is required for design generation'];
    }
    return [];
  }

  async prepare(): Promise<void> {
    /* nada que preparar: cómputo puro y determinista */
  }

  async generate(ctx: GeneratorContext): Promise<GenerationResult> {
    const scene = ctx.field.environment.scene;
    const seed = seedFromScene(scene);
    const palette =
      (ctx.field.style?.visual as { palette?: string } | undefined)?.palette ?? 'neoViolet';
    const png = composeDesign2D({ width: 512, height: 512, seed, palette: palette as never });

    return {
      artifact: png,
      metadata: { kind: 'design', modality: 'design', width: 512, height: 512, palette, seed },
      confidence: 0.9,
      provenance: 'design:keyless:compose',
    };
  }

  inspect(result: GenerationResult): Record<string, unknown> {
    return { ...result.metadata };
  }

  async export(): Promise<string | null> {
    return null;
  }
}
