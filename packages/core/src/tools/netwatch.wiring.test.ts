import { describe, expect, it } from 'vitest';
import {
  TOOL_DESCRIPTIONS,
  decideNetAction,
  parseWlanInterfaces,
  resolveNetWatchConfig,
  type Capability,
} from './index';

/**
 * Wiring de la capability `netwatch` (loop-112).
 *
 * El registro de la tool `netwatch_manage` vive en `ai/llm.ts` dentro de `chatStream`
 * (función no exportada); lo verificable aquí es el CONTRATO PÚBLICO que ese registro
 * consume: descriptor en TOOL_DESCRIPTIONS, union `Capability` y re-export plano del
 * dominio desde el barrel (`export * from './netwatch'`, sin colisión TS2308 — los
 * símbolos con prefijo Net y Wlan son únicos en el repo, verificado por grep). El
 * bloque de llm.ts queda cubierto por el typecheck FULL.
 */
describe('wiring netwatch (loop-112)', () => {
  it('expone el descriptor de la capability en TOOL_DESCRIPTIONS', () => {
    const d = TOOL_DESCRIPTIONS.netwatch;
    expect(d).toBeTruthy();
    expect(d).toMatch(/netsh/i);
    for (const accion of ['reconnect', 'scan', 'report_only']) expect(d).toContain(accion);
  });

  it("'netwatch' es un Capability válido y tiene descriptor", () => {
    const cap: Capability = 'netwatch';
    expect(cap).toBe('netwatch');
    expect(Object.keys(TOOL_DESCRIPTIONS)).toContain(cap);
  });

  it('el barrel re-exporta el dominio operativo sin colisiones', () => {
    // Contrato mínimo consumido por llm.ts y runners:
    expect(typeof parseWlanInterfaces).toBe('function');
    expect(typeof decideNetAction).toBe('function');
    expect(typeof resolveNetWatchConfig).toBe('function');
    // Decisión end-to-end mínima sobre fixture ES real:
    const summary = {
      presente: true,
      connected: false,
      ssid: null,
      senalPct: null,
      perfil: 'Norma-2.4',
    };
    const d = decideNetAction({
      summary,
      probeOk: false,
      accionesRecientes: 0,
      ultimaAccionHaceSeg: null,
      config: resolveNetWatchConfig({}),
    });
    expect(d.accion).toBe('reconnect');
  });
});
