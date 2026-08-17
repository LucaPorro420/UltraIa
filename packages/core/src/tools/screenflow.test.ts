import { describe, expect, it } from 'vitest';
import {
  screenflow,
  validateActionScript,
  planRuns,
  buildFfmpegCapture,
  buildOutputNaming,
  buildManifest,
  scheduleCmd,
  resolveState,
  MAX_RETRIES,
  type ActionScript,
} from './screenflow';

const validScript: ActionScript = {
  name: 'demo-tutorial',
  description: 'Demo pipeline ScreenFlow',
  capture: { fps: 30, region: '1920x1080+0+0' },
  actions: [
    { type: 'open_url', url: 'https://example.com' },
    { type: 'sleep', ms: 1500 },
    { type: 'type', text: 'hola mundo' },
    { type: 'click', x: 640, y: 360 },
    { type: 'screenshot', name: 'step1' },
    { type: 'end' },
  ],
};

describe('screenflow · validateActionScript', () => {
  it('acepta un script válido', () => {
    const r = validateActionScript(validScript);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.actions.length).toBe(6);
  });

  it('rechaza tipos de acción desconocidos', () => {
    const r = validateActionScript({ name: 'x', actions: [{ type: 'fly' }] });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('rechaza coords negativas', () => {
    const r = validateActionScript({
      name: 'x',
      actions: [{ type: 'click', x: -1, y: 0 }],
    });
    expect(r.ok).toBe(false);
  });

  it('estima duración desde las acciones', () => {
    const r = validateActionScript(validScript);
    // open_url 2.5 + sleep 1.5 + type 0.2 + click 0.4 + screenshot 0.6 = 5.2s
    expect(r.estimatedDurationSec).toBe(5);
  });

  it('advierte sin acción end final', () => {
    const r = validateActionScript({
      name: 'x',
      actions: [{ type: 'sleep', ms: 100 }],
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.includes('end'))).toBe(true);
  });

  it('rechaza scripts que exceden el máximo de duración', () => {
    const r = validateActionScript({
      name: 'x',
      actions: Array.from({ length: 100 }, () => ({ type: 'sleep' as const, ms: 600_000 })),
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('máximo');
  });
});

describe('screenflow · planRuns', () => {
  it('un run con todo el script por defecto', () => {
    const runs = planRuns(validScript);
    expect(runs.length).toBe(1);
    expect(runs[0].actionSlice.length).toBe(6);
    expect(runs[0].captureFps).toBe(30);
  });

  it('segmenta con actionsPerRun', () => {
    const runs = planRuns(validScript, { actionsPerRun: 2 });
    expect(runs.length).toBe(3);
    expect(runs[0].actionSlice).toEqual([0, 1]);
    expect(runs[2].actionSlice).toEqual([4, 5]);
  });

  it('estimados por run coherentes', () => {
    const runs = planRuns(validScript, { actionsPerRun: 2 });
    expect(runs[0].estimatedSec).toBeGreaterThanOrEqual(3); // open_url 2.5 + sleep 1.5
  });
});

describe('screenflow · buildFfmpegCapture', () => {
  it('genera argv gdigrab con fps y crf por defecto', () => {
    const argv = buildFfmpegCapture('out_%03d.mp4');
    expect(argv[0]).toBe('ffmpeg');
    expect(argv).toContain('gdigrab');
    expect(argv).toContain('libx264');
    expect(argv.join(' ')).toContain('anullsrc'); // sin audio device → silencio
  });

  it('usa región y audio device cuando se pasan', () => {
    const argv = buildFfmpegCapture('out_%03d.mp4', {
      region: '1280x720+10+10',
      audioDevice: 'CABLE Input',
    });
    expect(argv).toContain('desktop=1280x720+10+10');
    expect(argv).toContain('dshow');
    expect(argv.join(' ')).toContain('CABLE Input');
  });

  it('segmenta con -segment_time', () => {
    const argv = buildFfmpegCapture('out_%03d.mp4', { segmentSec: 30 });
    expect(argv.join(' ')).toContain('-segment_time 30');
  });

  it('determinista', () => {
    expect(buildFfmpegCapture('a.mp4')).toEqual(buildFfmpegCapture('a.mp4'));
  });
});

describe('screenflow · naming + manifest + scheduling', () => {
  it('nomenclatura YYYYMMDD-HHMMSS-slug-vN.mp4 + latest', () => {
    const n = buildOutputNaming('20260817120000', 'Mi Tutorial!', 2);
    expect(n.finalName).toBe('20260817120000-mi-tutorial-v2.mp4');
    expect(n.latestName).toBe('mi-tutorial-latest.mp4');
    expect(n.dir).toBe('.ultraia/recordings/20260817120000');
  });

  it('manifest incluye toolchain y archivos del paquete', () => {
    const m = buildManifest('20260817120000', validScript, planRuns(validScript));
    expect(m.script).toBe('demo-tutorial');
    expect(m.files).toContain('final.mp4');
    expect(m.runs[0].estimatedSec).toBeGreaterThan(0);
    expect(m.toolchain.ffmpeg).toBe('>=5');
  });

  it('scheduleCmd genera schtasks para HH:mm', () => {
    const s = scheduleCmd({ scriptPath: 'Task/run_screenflow.ts', runId: 'r1', when: '09:30' });
    expect(s.argv).toContain('schtasks');
    expect(s.note).toContain('DAILY');
  });

  it('scheduleCmd acepta cron y rechaza formato inválido', () => {
    const cron = scheduleCmd({ scriptPath: 'x', runId: 'r2', when: '*/30 * * * *' });
    expect(cron.note).toContain('crontab');
    const bad = scheduleCmd({ scriptPath: 'x', runId: 'r3', when: 'mañana' });
    expect(bad.argv).toEqual([]);
  });
});

describe('screenflow · continuidad (resolveState)', () => {
  const now = '2026-08-17T12:00:00.000Z';

  it('arranca desde cero sin estado previo', () => {
    const r = resolveState(null, now);
    expect(r.action).toBe('start');
    expect(r.state.status).toBe('pending');
    expect(r.state.attempts).toBe(0);
  });

  it('resume un run interrumpido (fail-soft) con retry', () => {
    const prev = {
      script: 'demo',
      runId: '20260817115900-demo',
      step: 3,
      attempts: 0,
      status: 'running' as const,
      startedAt: '2026-08-17T11:59:00.000Z',
      updatedAt: '2026-08-17T11:59:01.000Z',
    };
    const r = resolveState(prev, now);
    expect(r.action).toBe('resume');
    expect(r.state.step).toBe(3);
    expect(r.state.attempts).toBe(1);
  });

  it('se rinde tras MAX_RETRIES', () => {
    const prev = {
      script: 'demo',
      runId: '20260817115900-demo',
      step: 5,
      attempts: MAX_RETRIES,
      status: 'running' as const,
      startedAt: '2026-08-17T11:59:00.000Z',
      updatedAt: '2026-08-17T11:59:01.000Z',
    };
    const r = resolveState(prev, now);
    expect(r.action).toBe('give-up');
    expect(r.state.status).toBe('failed');
  });

  it('estado published no se reanuda', () => {
    const prev = {
      script: 'demo',
      runId: '20260817115900-demo',
      step: 6,
      attempts: 0,
      status: 'published' as const,
      startedAt: '2026-08-17T11:59:00.000Z',
      updatedAt: '2026-08-17T11:59:30.000Z',
    };
    const r = resolveState(prev, now);
    expect(r.action).toBe('start');
  });
});

describe('screenflow · api pública', () => {
  it('expone constantes y helpers', () => {
    expect(MAX_RETRIES).toBe(3);
    expect(screenflow.ACTION_TYPES).toContain('end');
    expect(screenflow.RECORDINGS_ROOT).toBe('.ultraia/recordings');
    expect(typeof screenflow.buildManifest).toBe('function');
    expect(typeof screenflow.resolveState).toBe('function');
  });
});
