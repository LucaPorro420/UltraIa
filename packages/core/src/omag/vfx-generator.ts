import { planEffect, renderEffectHtml, type EffectKind, type EffectOptions, type EffectPlan } from '../tools/codevfx';
import type { Generator, GeneratorContext, GenerationResult } from './generators';

export class VfxGeneratorAdapter implements Generator {
  name = 'vfx-code';
  modality: 'vfx' = 'vfx';

  validate(ctx: GeneratorContext): string[] {
    const errors: string[] = [];
    if (!ctx.field.environment?.scene) {
      errors.push('MediaField.environment.scene is required for VFX generation');
    }
    const kind = ctx.constraints?.vfxKind as EffectKind | undefined;
    if (kind && !['fire', 'ice', 'lightning', 'meteor', 'beam', 'ground', 'void', 'plasma', 'frost'].includes(kind)) {
      errors.push(`Invalid vfxKind: ${kind}. Must be one of: fire, ice, lightning, meteor, beam, ground, void, plasma, frost`);
    }
    return errors;
  }

  async prepare(): Promise<void> {}

  async generate(ctx: GeneratorContext): Promise<GenerationResult> {
    const kind = (ctx.constraints?.vfxKind as EffectKind) ?? 'fire';
    const intensity = typeof ctx.constraints?.intensity === 'number' ? ctx.constraints.intensity : 1;
    const speed = typeof ctx.constraints?.speed === 'number' ? ctx.constraints.speed : 1;
    const width = typeof ctx.constraints?.width === 'number' ? ctx.constraints.width : 512;
    const height = typeof ctx.constraints?.height === 'number' ? ctx.constraints.height : 512;

    const opts: EffectOptions = { intensity, speed };
    const effectPlan = planEffect(kind, opts);
    const html = renderEffectHtml(effectPlan, { width, height, title: `VFX: ${kind}` });

    return {
      artifact: {
        html,
        width,
        height,
        kind,
        glsl: effectPlan.shaderGlsl,
        palette: effectPlan.palette,
        physics: effectPlan.physics,
        particles: effectPlan.particles,
        hotkey: effectPlan.hotkey,
      },
      metadata: {
        modality: 'vfx',
        kind,
        intensity,
        speed,
        width,
        height,
        particleCount: effectPlan.particles.count,
        physics: effectPlan.physics,
      },
      confidence: 0.9,
      provenance: `vfx:codevfx:${kind}:intensity-${intensity}:speed-${speed}`,
    };
  }

  inspect(result: GenerationResult): Record<string, unknown> {
    const artifact = result.artifact as {
      kind: string;
      width: number;
      height: number;
      particles: { count: number };
      palette: { base: string; accent: string; energy: string };
    };
    return {
      kind: artifact.kind,
      dimensions: `${artifact.width}x${artifact.height}`,
      particles: artifact.particles.count,
      palette: artifact.palette,
      confidence: result.confidence,
    };
  }

  async export(result: GenerationResult, target?: string): Promise<string | null> {
    const artifact = result.artifact as { html: string };
    if (target) {
      const fs = await import('node:fs');
      fs.writeFileSync(target, artifact.html);
      return target;
    }
    return `data:text/html;base64,${Buffer.from(artifact.html).toString('base64')}`;
  }
}

export function createVfxGeneratorAdapter(): VfxGeneratorAdapter {
  return new VfxGeneratorAdapter();
}