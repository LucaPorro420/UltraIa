import { describe, expect, it } from 'vitest';
import {
  screenflow,
  validateActionScript,
  validateExecCmd,
  resolveHotWatch,
  buildPublicationPackage,
  buildManifest,
  planRuns,
  buildFfmpegCapture,
  buildOutputNaming,
  scheduleCmd,
  resolveState,
  MAX_RETRIES,
  HOT_DIR,
  type ActionScript,
  type RunState,
} from './screenflow';
import type { PublicationPackage } from './present';

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

describe('screenflow · exec allowlist (validateExecCmd)', () => {
  it('acepta binarios de la allowlist con argumentos', () => {
    expect(validateExecCmd('python scripts/topics.py --dry-run')).toEqual({ ok: true });
    expect(validateExecCmd('ffmpeg -version')).toEqual({ ok: true });
    expect(validateExecCmd('node Task/run_screenflow.ts --dry-run')).toEqual({ ok: true });
    expect(validateExecCmd('npm run build')).toEqual({ ok: true });
  });

  it('tolera la extensión .exe/.cmd/.bat en el binario base', () => {
    expect(validateExecCmd('python.exe scripts/topics.py')).toEqual({ ok: true });
    expect(validateExecCmd('ffmpeg.exe -version')).toEqual({ ok: true });
  });

  it('rechaza binarios fuera de la allowlist', () => {
    const r = validateExecCmd('rm -rf /tmp');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('allowlist');
    expect(validateExecCmd('powershell -c "x"').ok).toBe(false);
    expect(validateExecCmd('cmd /c dir').ok).toBe(false);
    expect(validateExecCmd('del /f *.mp4').ok).toBe(false);
    expect(validateExecCmd('format c:').ok).toBe(false);
  });

  it('rechaza rutas absolutas como binario', () => {
    const r = validateExecCmd('C:\\Windows\\System32\\cmd.exe /c dir');
    expect(r.ok).toBe(false);
    expect(validateExecCmd('C:/Windows/System32/powershell.exe -c x').ok).toBe(false);
    expect(validateExecCmd('./script.sh').ok).toBe(false);
    expect(validateExecCmd('/usr/bin/rm -rf x').ok).toBe(false);
  });

  it('rechaza metacaracteres de shell', () => {
    expect(validateExecCmd('python x.py; rm -rf /').ok).toBe(false);
    expect(validateExecCmd('python x.py && node y.js').ok).toBe(false);
    expect(validateExecCmd('python x.py | ffmpeg -i -').ok).toBe(false);
    expect(validateExecCmd('python x.py > out.txt').ok).toBe(false);
    expect(validateExecCmd('node -e "`rm -rf /`"').ok).toBe(false);
    expect(validateExecCmd('node -e "$(rm -rf /)"').ok).toBe(false);
    expect(validateExecCmd('ffmpeg -i a.mp4\r\nrm -rf /').ok).toBe(false);
  });

  it('rechaza vacío y exceso de longitud', () => {
    expect(validateExecCmd('   ').ok).toBe(false);
    expect(validateExecCmd('x'.repeat(501)).ok).toBe(false);
  });

  it('validateActionScript acepta exec permitido', () => {
    const r = validateActionScript({
      name: 'x',
      actions: [
        { type: 'exec', cmd: 'python scripts/topics.py --dry-run' },
        { type: 'end' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('validateActionScript rechaza exec denegado con error acumulado', () => {
    const r = validateActionScript({
      name: 'x',
      actions: [
        { type: 'exec', cmd: 'rm -rf /tmp' },
        { type: 'exec', cmd: 'powershell -c "x"' },
        { type: 'end' },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBe(2);
    expect(r.errors[0]).toContain('exec');
    expect(r.errors[0]).toContain('allowlist');
  });

  it('namespace expone EXEC_ALLOWLIST y validateExecCmd', () => {
    expect(screenflow.EXEC_ALLOWLIST).toContain('python');
    expect(screenflow.EXEC_ALLOWLIST).toContain('ffmpeg');
    expect(typeof screenflow.validateExecCmd).toBe('function');
  });
});

describe('screenflow · hot watch (resolveHotWatch)', () => {
  it('detecta scripts JSON nuevos', () => {
    const r = resolveHotWatch(['a.json', 'b.txt', 'c.json'], ['a.json']);
    expect(r.nuevos).toEqual(['c.json']);
    expect(r.conocidos).toEqual(['a.json', 'c.json']);
  });

  it('idempotente: con los conocidos devueltos no hay nuevos', () => {
    const first = resolveHotWatch(['a.json', 'b.json']);
    const second = resolveHotWatch(['a.json', 'b.json'], first.conocidos);
    expect(first.nuevos).toEqual(['a.json', 'b.json']);
    expect(second.nuevos).toEqual([]);
  });

  it('ignora archivos que no son .json', () => {
    const r = resolveHotWatch(['script.json', 'video.mp4', 'data.txt', 'X.JSON']);
    expect(r.nuevos).toEqual(['X.JSON', 'script.json']); // case-insensitive + ordenado
  });

  it('sin archivos no devuelve nuevos', () => {
    expect(resolveHotWatch([]).nuevos).toEqual([]);
    expect(resolveHotWatch(['a.json'], ['a.json']).nuevos).toEqual([]);
  });
});

describe('screenflow · puente cola Publication (buildPublicationPackage)', () => {
  const script: ActionScript = {
    name: 'demo-tutorial',
    description: 'Demo pipeline ScreenFlow',
    actions: [{ type: 'sleep', ms: 100 }, { type: 'end' }],
  };

  it('construye un PublicationPackage válido (canal blog)', () => {
    const manifest = buildManifest('20260817130000-demo', script, planRuns(script));
    const pkg = buildPublicationPackage('20260817130000-demo', script, manifest);
    expect(pkg.tema).toBe('demo-tutorial');
    expect(pkg.contenido).toContain('Demo pipeline');
    expect(pkg.canales).toEqual(['blog']);
    expect(pkg.media).toEqual(['.ultraia/recordings/20260817130000-demo/final.mp4']);
    expect(pkg.captionsByChannel.blog.caption).toBeTruthy();
    expect(pkg.horarioSugerido.blog).toBeTruthy();
    expect(pkg.branding.marca).toBeTruthy();
  });

  it('usa el nombre como contenido cuando no hay descripción', () => {
    const manifest = buildManifest('20260817130000-x', { name: 'sin-desc', actions: [{ type: 'end' }] }, []);
    const pkg = buildPublicationPackage('20260817130000-x', { name: 'sin-desc', actions: [{ type: 'end' }] }, manifest);
    expect(pkg.contenido).toContain('sin-desc');
  });

  it('determinista (sin campo generadoAt)', () => {
    const manifest = buildManifest('20260817130000-demo', script, planRuns(script));
    const a = buildPublicationPackage('20260817130000-demo', script, manifest);
    const b = buildPublicationPackage('20260817130000-demo', script, manifest);
    // generadoAt es no-determinista (new Date().toISOString()) -> comparar sin ese campo
    const stripGeneradoAt = (obj: any) => {
      const { generadoAt, ...rest } = obj;
      return rest;
    };
    expect(JSON.stringify(stripGeneradoAt(a))).toBe(JSON.stringify(stripGeneradoAt(b)));
  });

  it('namespace expone HOT_DIR y los nuevos helpers', () => {
    expect(HOT_DIR).toBe('.ultraia/hot');
    expect(screenflow.HOT_DIR).toBe('.ultraia/hot');
    expect(typeof screenflow.resolveHotWatch).toBe('function');
    expect(typeof screenflow.buildPublicationPackage).toBe('function');
  });
});

describe('screenflow · hot watch runner (integración mock)', () => {
  const validScript: ActionScript = {
    name: 'hot-test',
    description: 'Test hot watch',
    actions: [{ type: 'sleep', ms: 100 }, { type: 'end' }],
  };

  function makeRunState(overrides: Partial<RunState> = {}): RunState {
    return {
      script: 'hot-test',
      runId: '20260817120000-hot-test',
      step: 0,
      attempts: 0,
      status: 'pending',
      startedAt: '2026-08-17T12:00:00.000Z',
      updatedAt: '2026-08-17T12:00:00.000Z',
      ...overrides,
    };
  }

  it('resolveHotWatch + buildPublicationPackage + resolveState flujo completo', () => {
    // 1. detecta script nuevo
    const { nuevos, conocidos } = resolveHotWatch(['demo.json', 'old.json'], ['old.json']);
    expect(nuevos).toEqual(['demo.json']);
    expect(conocidos).toEqual(['demo.json', 'old.json']);

    // 2. buildPublicationPackage genera pkg válido para blog
    const manifest = buildManifest('20260817120000-demo', validScript, planRuns(validScript));
    const pkg = buildPublicationPackage('20260817120000-demo', validScript, manifest);
    expect(pkg.canales).toEqual(['blog']);
    expect(pkg.tema).toBe('hot-test');

    // 3. resolveState con run previo interrupted → resume
    const prev = makeRunState({ status: 'running', step: 2, attempts: 0 });
    const { action, state } = resolveState(prev, '2026-08-17T12:01:00.000Z');
    expect(action).toBe('resume');
    expect(state.attempts).toBe(1);
    expect(state.step).toBe(2);
  });

  it('resolveHotWatch idempotente + buildPublicationPackage determinista', () => {
    const first = resolveHotWatch(['a.json', 'b.json']);
    const second = resolveHotWatch(['a.json', 'b.json', 'c.json'], first.conocidos);
    expect(first.nuevos).toEqual(['a.json', 'b.json']);
    expect(second.nuevos).toEqual(['c.json']);
    expect(second.conocidos).toEqual(['a.json', 'b.json', 'c.json']);

    const manifest = buildManifest('20260817120000-demo', validScript, planRuns(validScript));
    const pkg1 = buildPublicationPackage('20260817120000-demo', validScript, manifest);
    const pkg2 = buildPublicationPackage('20260817120000-demo', validScript, manifest);
    // generadoAt es no-determinista (new Date().toISOString()) -> comparar sin ese campo
    const stripGeneradoAt = (obj: any) => {
      const { generadoAt, ...rest } = obj;
      return rest;
    };
    expect(JSON.stringify(stripGeneradoAt(pkg1))).toBe(JSON.stringify(stripGeneradoAt(pkg2)));
  });

  it('resolveState: give-up tras MAX_RETRIES', () => {
    const prev = makeRunState({ status: 'running', attempts: 3 }); // MAX_RETRIES = 3
    const { action, state } = resolveState(prev, '2026-08-17T12:01:00.000Z');
    expect(action).toBe('give-up');
    expect(state.status).toBe('failed');
  });

  it('resolveState: published no se reanuda', () => {
    const prev = makeRunState({ status: 'published' });
    const { action } = resolveState(prev, '2026-08-17T12:01:00.000Z');
    expect(action).toBe('start');
  });

  it('buildManifest incluye HOT_DIR y RECORDINGS_ROOT en namespace', () => {
    expect(screenflow.HOT_DIR).toBe('.ultraia/hot');
    expect(screenflow.RECORDINGS_ROOT).toBe('.ultraia/recordings');
  });
});
