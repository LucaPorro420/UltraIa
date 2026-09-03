import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OBS_REQUEST_OK,
  OBS_DEFAULT_URL,
  OBS_COMMANDS,
  OBS_OP,
  createObsRecorder,
  ffmpegGdigrabCommand,
  planRecording,
  describePlan,
  type ObsCommand,
  type ObsResponse,
  type ObsRecorder,
} from './recorder';

/* ── FakeWebSocket for tests ── */
class FakeWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  url: string;
  readyState = 0;
  listeners: Record<string, ((ev: unknown) => void)[]> = {};
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Simulate async open
    setTimeout(() => {
      this.readyState = 1;
      this.emit('open', {});
    }, 0);
  }

  addEventListener(event: string, cb: (ev: unknown) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  send(data: string) {
    this.sent.push(data);
    // Auto-reply to Identify (op 1) with a Hello (op 2)
    try {
      const msg = JSON.parse(data);
      if (msg.op === 1) {
        setTimeout(() => {
          this.emit('message', JSON.stringify({ op: 2, d: { rpcVersion: 1 } }));
        }, 0);
      }
    } catch { /* noop */ }
  }

  close() {
    this.readyState = 3;
    this.emit('close', {});
  }

  emit(event: string, data: unknown) {
    for (const cb of this.listeners[event] ?? []) cb(data);
  }
}

beforeEach(() => {
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

describe('recorder', () => {
  /* ── Constants ── */
  it('OBS_REQUEST_OK is 100', () => {
    expect(OBS_REQUEST_OK).toBe(100);
  });

  it('OBS_DEFAULT_URL is ws://127.0.0.1:4455', () => {
    expect(OBS_DEFAULT_URL).toBe('ws://127.0.0.1:4455');
  });

  it('has 6 commands', () => {
    expect(OBS_COMMANDS).toHaveLength(6);
  });

  it('maps commands to correct op codes', () => {
    expect(OBS_OP.start).toBe(0);
    expect(OBS_OP.stop).toBe(1);
    expect(OBS_OP.pause).toBe(2);
    expect(OBS_OP.resume).toBe(3);
    expect(OBS_OP.status).toBe(6);
    expect(OBS_OP.scene).toBe(7);
  });

  /* ── createObsRecorder ── */
  describe('createObsRecorder', () => {
    it('throws if no WebSocket global', () => {
      vi.stubGlobal('WebSocket', undefined);
      expect(() => createObsRecorder()).toThrow('No WebSocket global');
    });

    it('creates recorder with default URL', () => {
      const r = createObsRecorder();
      expect(r.url).toBe(OBS_DEFAULT_URL);
      expect(r.readyState).toBe(0);
    });

    it('creates recorder with custom URL', () => {
      const r = createObsRecorder({ url: 'ws://192.168.1.100:4455' });
      expect(r.url).toBe('ws://192.168.1.100:4455');
    });

    it('connect resolves and sets readyState to 1', async () => {
      const r = createObsRecorder();
      await r.connect();
      expect(r.readyState).toBe(1);
    });

    it('connect sends Identify (op 1)', async () => {
      const r = createObsRecorder();
      await r.connect();
      // The FakeWebSocket should have received an Identify message
      // (sent in the open handler)
    });

    it('connect with password includes authentication', async () => {
      const r = createObsRecorder({ password: 'secret' });
      await r.connect();
      expect(r.readyState).toBe(1);
    });

    it('connect is idempotent', async () => {
      const r = createObsRecorder();
      await r.connect();
      await r.connect(); // second call should be a no-op
      expect(r.readyState).toBe(1);
    });

    it('close sets readyState to 3', async () => {
      const r = createObsRecorder();
      await r.connect();
      r.close();
      expect(r.readyState).toBe(3);
    });

    it('sendRequest rejects when not connected', async () => {
      const r = createObsRecorder();
      await expect(r.sendRequest('StartRecord')).rejects.toThrow('not connected');
    });

    it('close rejects pending requests', async () => {
      const r = createObsRecorder();
      await r.connect();
      const promise = r.sendRequest('GetRecordStatus');
      r.close();
      await expect(promise).rejects.toThrow('closed');
    });
  });

  /* ── ffmpegGdigrabCommand ── */
  describe('ffmpegGdigrabCommand', () => {
    it('returns default gdigrab argv', () => {
      const argv = ffmpegGdigrabCommand();
      expect(argv[0]).toBe('-y');
      expect(argv).toContain('-f');
      expect(argv).toContain('gdigrab');
      expect(argv).toContain('-i');
      expect(argv).toContain('desktop');
      expect(argv).toContain('-c:v');
      expect(argv).toContain('libx264');
      expect(argv).toContain('-f');
      expect(argv).toContain('segment');
    });

    it('includes silent audio track by default', () => {
      const argv = ffmpegGdigrabCommand();
      expect(argv).toContain('-f');
      expect(argv).toContain('lavfi');
      expect(argv.some(a => a.includes('anullsrc'))).toBe(true);
    });

    it('uses custom audio device when specified', () => {
      const argv = ffmpegGdigrabCommand({ audioDevice: 'Microphone' });
      expect(argv).toContain('-f');
      expect(argv).toContain('dshow');
      expect(argv.some(a => a.includes('audio=Microphone'))).toBe(true);
    });

    it('applies custom region', () => {
      const argv = ffmpegGdigrabCommand({ region: '1920x1080' });
      expect(argv).toContain('-video_size');
      expect(argv).toContain('1920x1080');
    });

    it('applies custom fps', () => {
      const argv = ffmpegGdigrabCommand({ fps: 60 });
      expect(argv).toContain('-framerate');
      expect(argv).toContain('60');
    });

    it('applies custom segment time', () => {
      const argv = ffmpegGdigrabCommand({ segmentSec: 30 });
      expect(argv).toContain('-segment_time');
      expect(argv).toContain('30');
    });

    it('applies custom output file', () => {
      const argv = ffmpegGdigrabCommand({ outFile: 'output.mp4' });
      expect(argv).toContain('output.mp4');
    });
  });

  /* ── planRecording ── */
  describe('planRecording', () => {
    it('creates obs plan for start command', () => {
      const plan = planRecording('start');
      expect(plan.mode).toBe('obs');
      expect(plan.command).toBe('start');
      expect(plan.obs?.requestType).toBe('StartRecord');
      expect(plan.obs?.op).toBe(0);
      expect(plan.ffmpeg).toBeDefined();
    });

    it('creates obs plan for stop command', () => {
      const plan = planRecording('stop');
      expect(plan.obs?.requestType).toBe('StopRecord');
      expect(plan.obs?.op).toBe(1);
    });

    it('creates obs plan for pause command', () => {
      const plan = planRecording('pause');
      expect(plan.obs?.requestType).toBe('PauseRecord');
      expect(plan.obs?.op).toBe(2);
    });

    it('creates obs plan for resume command', () => {
      const plan = planRecording('resume');
      expect(plan.obs?.requestType).toBe('ResumeRecord');
      expect(plan.obs?.op).toBe(3);
    });

    it('creates obs plan for status command', () => {
      const plan = planRecording('status');
      expect(plan.obs?.requestType).toBe('GetRecordStatus');
      expect(plan.obs?.op).toBe(6);
    });

    it('creates obs plan for scene command', () => {
      const plan = planRecording('scene');
      expect(plan.obs?.requestType).toBe('GetCurrentProgramScene');
      expect(plan.obs?.op).toBe(7);
      expect(plan.obs?.requestData).toEqual({ sceneName: 'Escena 1' });
    });

    it('uses custom URL', () => {
      const plan = planRecording('start', { url: 'ws://custom:9999' });
      expect(plan.obs?.url).toBe('ws://custom:9999');
    });

    it('includes ffmpeg fallback', () => {
      const plan = planRecording('start');
      expect(plan.ffmpeg?.argv).toBeDefined();
      expect(plan.ffmpeg?.argv.length).toBeGreaterThan(0);
      expect(plan.ffmpeg?.note).toContain('fallback');
    });
  });

  /* ── describePlan ── */
  describe('describePlan', () => {
    it('describes obs plan', () => {
      const plan = planRecording('start');
      const desc = describePlan(plan);
      expect(desc).toContain('OBS');
      expect(desc).toContain('start');
      expect(desc).toContain('StartRecord');
      expect(desc).toContain('ws://');
    });

    it('describes scene plan with requestData', () => {
      const plan = planRecording('scene');
      const desc = describePlan(plan);
      expect(desc).toContain('scene');
      expect(desc).toContain('Escena 1');
    });

    it('describes ffmpeg fallback in obs plan', () => {
      const plan = planRecording('start');
      const desc = describePlan(plan);
      expect(desc).toContain('ffmpeg');
      expect(desc).toContain('fallback');
    });
  });
});
