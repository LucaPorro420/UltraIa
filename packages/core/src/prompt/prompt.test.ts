import { describe, expect, it } from 'vitest';
import type { AiGateway } from '../ai/gateway';
import {
  adaptToMediaPlan,
  buildLocalPlan,
  detectLanguage,
  normalizeLanguage,
  parseDirectorPlan,
} from './director';

describe('detectLanguage', () => {
  it('detects latin-script languages via stopwords', () => {
    expect(detectLanguage('el gato duerme en la cama')).toBe('es');
    expect(detectLanguage('the cat sleeps on the bed')).toBe('en');
    expect(detectLanguage('le chat dort sur le lit')).toBe('fr');
    expect(detectLanguage('o gato dorme na cama')).toBe('pt');
    expect(detectLanguage('die Katze schläft auf dem Bett')).toBe('de');
    expect(detectLanguage('il gatto dorme sul letto')).toBe('it');
  });

  it('detects non-latin scripts', () => {
    expect(detectLanguage('قطة نائمة على السرير')).toBe('ar');
    expect(detectLanguage('猫がベッドで寝ています')).toBe('ja');
    expect(detectLanguage('猫在床上睡觉')).toBe('zh');
    expect(detectLanguage('кот спит на кровати')).toBe('ru');
  });

  it('defaults to spanish for empty input', () => {
    expect(detectLanguage('')).toBe('es');
  });
});

describe('normalizeLanguage', () => {
  it('maps aliases and BCP-47 codes', () => {
    expect(normalizeLanguage('castellano')).toBe('es');
    expect(normalizeLanguage('english')).toBe('en');
    expect(normalizeLanguage('zh-CN')).toBe('zh');
    expect(normalizeLanguage('ar-SA')).toBe('ar');
    expect(normalizeLanguage('日本語')).toBe('zh');
  });
});

describe('parseDirectorPlan', () => {
  it('parses strict JSON output', () => {
    const plan = parseDirectorPlan(
      '{"language":"es","script":"Un perro corre en el parque","images":["a dog running in a park"],"shots":1,"motion":"pan-left","bgm":"orquesta suave","style":"cinematic"}',
    );
    expect(plan.language).toBe('es');
    expect(plan.motion).toBe('pan-left');
    expect(plan.images).toEqual(['a dog running in a park']);
  });

  it('tolerates markdown fences', () => {
    const plan = parseDirectorPlan(
      '```json\n{"language":"ar","script":"قطة تجري","images":["a cat running"],"shots":1,"motion":"zoom-in","bgm":"","style":""}\n```',
    );
    expect(plan.language).toBe('ar');
    expect(plan.script).toBe('قطة تجري');
  });

  it('rejects invalid JSON', () => {
    expect(() => parseDirectorPlan('not json at all')).toThrow();
  });

  it('parses per-shot motions (new format) and keeps motion for compatibility', () => {
    const plan = parseDirectorPlan(
      '{"language":"es","script":"Un perro corre en el parque","images":["a dog running in a park"],"shots":3,"motions":["slow push-in","pan right","aerial drone shot"],"motion":"slow push-in","bgm":"orquesta suave","style":"cinematic"}',
    );
    expect(plan.motions).toEqual(['slow-push-in', 'pan-right', 'aerial-drone-shot']);
    expect(plan.motion).toBe('slow-push-in');
  });

  it('falls back to the single motion when motions is absent (backward compatible)', () => {
    const plan = parseDirectorPlan(
      '{"language":"es","script":"Un perro corre","images":["a dog running"],"shots":2,"motion":"tilt up","bgm":"","style":"cinematic"}',
    );
    expect(plan.motions).toEqual(['tilt-up']);
    expect(plan.motion).toBe('tilt-up');
  });

  it('normalizes unknown motions to zoom-in and trims to the shot count', () => {
    const plan = parseDirectorPlan(
      '{"language":"es","script":"Un perro corre","images":["a dog running"],"shots":2,"motions":["wacky spin","static shot","dolly in"],"bgm":"","style":""}',
    );
    expect(plan.motions).toEqual(['zoom-in', 'static-shot']);
  });
});

describe('buildLocalPlan (sin LLM)', () => {
  it('builds a minimal plan in the detected language', () => {
    const plan = buildLocalPlan('قطة في المدينة ليلاً');
    expect(plan.language).toBe('ar');
    expect(plan.images[0]).toBe('قطة في المدينة ليلاً');
    expect(plan.shots).toBe(1);
  });
});

describe('adaptToMediaPlan', () => {
  it('falls back to local plan without a gateway', async () => {
    const plan = await adaptToMediaPlan('the sun rises over the ocean');
    expect(plan.language).toBe('en');
    expect(plan.shots).toBe(1);
  });

  it('uses the gateway when available and parses its output', async () => {
    const gateway: AiGateway = {
      generateStructured: async () => ({}) as never,
      chatText: async () =>
        '{"language":"fr","script":"La mer est calme","images":["calm sea at sunset"],"shots":1,"motion":"zoom-out","bgm":"ambient","style":"cinematic"}',
    };
    const plan = await adaptToMediaPlan('la mer est calme', { gateway });
    expect(plan.language).toBe('fr');
    expect(plan.motion).toBe('zoom-out');
  });

  it('degrades to local plan when the gateway errors', async () => {
    const gateway: AiGateway = {
      generateStructured: async () => ({}) as never,
      chatText: async () => {
        throw new Error('model down');
      },
    };
    const plan = await adaptToMediaPlan('un robot en el espacio', { gateway });
    expect(plan.language).toBe('es');
  });
});