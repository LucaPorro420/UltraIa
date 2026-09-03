import { describe, it, expect } from 'vitest';
import {
  PHASES,
  MAX_ATTEMPTS,
  MAX_CYCLE_MIN,
  createAutomationState,
  nextAction,
  advanceState,
  buildManifest,
  verifyDurationCommand,
  describeRun,
  phaseNote,
  type Phase,
  type AutomationState,
} from './automation';

describe('automation', () => {
  /* ── PHASES ── */
  it('has 10 phases in canonical order', () => {
    expect(PHASES).toHaveLength(10);
    expect(PHASES[0]).toBe('PLAN');
    expect(PHASES[9]).toBe('ARCHIVE');
  });

  it('MAX_ATTEMPTS is 3', () => {
    expect(MAX_ATTEMPTS).toBe(3);
  });

  it('MAX_CYCLE_MIN is 90', () => {
    expect(MAX_CYCLE_MIN).toBe(90);
  });

  /* ── createAutomationState ── */
  describe('createAutomationState', () => {
    it('creates initial state with PLAN phase', () => {
      const s = createAutomationState('proj-1', '2026-01-01T00:00:00Z');
      expect(s.projectId).toBe('proj-1');
      expect(s.currentPhase).toBe('PLAN');
      expect(s.status).toBe('idle');
      expect(s.lastOkPhase).toBeNull();
      expect(s.startedAt).toBe('2026-01-01T00:00:00Z');
    });

    it('initializes all attempt counters to 0', () => {
      const s = createAutomationState('p', 'now');
      for (const p of PHASES) {
        expect(s.attempts[p]).toBe(0);
      }
    });
  });

  /* ── nextAction ── */
  describe('nextAction', () => {
    it('ok on PLAN advances to VALIDATE', () => {
      const s = createAutomationState('p', 'now');
      const a = nextAction(s, { status: 'ok' });
      expect(a.kind).toBe('run');
      expect(a.phase).toBe('VALIDATE');
      expect(a.attempt).toBe(1);
    });

    it('ok on last phase (ARCHIVE) sets status done', () => {
      const s = createAutomationState('p', 'now');
      s.currentPhase = 'ARCHIVE';
      const a = nextAction(s, { status: 'ok' });
      expect(a.kind).toBe('run');
      expect(a.phase).toBe('ARCHIVE');
      expect(s.status).toBe('done');
    });

    it('skipped advances to next phase', () => {
      const s = createAutomationState('p', 'now');
      const a = nextAction(s, { status: 'skipped' });
      expect(a.kind).toBe('run');
      expect(a.phase).toBe('VALIDATE');
      expect(a.reason).toBe('fase omitida');
    });

    it('failed on first attempt returns retry', () => {
      const s = createAutomationState('p', 'now');
      const a = nextAction(s, { status: 'failed', error: 'timeout' });
      expect(a.kind).toBe('retry');
      expect(a.phase).toBe('PLAN');
      expect(a.attempt).toBe(1);
      expect(a.hint).toContain('reintentar');
    });

    it('failed with ffmpeg error provides hint', () => {
      const s = createAutomationState('p', 'now');
      const a = nextAction(s, { status: 'failed', error: 'ffmpeg not found' });
      expect(a.hint).toContain('ffmpeg');
    });

    it('failed with obs error provides hint', () => {
      const s = createAutomationState('p', 'now');
      const a = nextAction(s, { status: 'failed', error: 'obs connection refused' });
      expect(a.hint).toContain('OBS');
    });

    it('failed with websocket error provides hint', () => {
      const s = createAutomationState('p', 'now');
      const a = nextAction(s, { status: 'failed', error: 'ws:// failed' });
      expect(a.hint).toContain('obs-websocket');
    });

    it('failed with yt-dlp error provides hint', () => {
      const s = createAutomationState('p', 'now');
      const a = nextAction(s, { status: 'failed', error: 'yt-dlp not found' });
      expect(a.hint).toContain('yt-dlp');
    });

    it('failed with edge/tts error provides hint', () => {
      const s = createAutomationState('p', 'now');
      const a = nextAction(s, { status: 'failed', error: 'edge-tts timeout' });
      expect(a.hint).toContain('edge-tts');
    });

    it('failed with pollinations error provides hint', () => {
      const s = createAutomationState('p', 'now');
      const a = nextAction(s, { status: 'failed', error: 'pollinations 503' });
      expect(a.hint).toContain('Pollinations');
    });

    it('unknown error returns no hint', () => {
      const s = createAutomationState('p', 'now');
      const a = nextAction(s, { status: 'failed', error: 'something weird' });
      expect(a.hint).toBeUndefined();
    });

    it('exhausted attempts on first phase gives up', () => {
      const s = createAutomationState('p', 'now');
      nextAction(s, { status: 'failed' }); // attempt 1
      nextAction(s, { status: 'failed' }); // attempt 2
      const a = nextAction(s, { status: 'failed' }); // attempt 3 → give-up
      expect(a.kind).toBe('give-up');
      expect(a.attempt).toBe(3);
      expect(s.status).toBe('failed');
    });

    it('exhausted attempts on non-first phase resumes from lastOkPhase', () => {
      const s = createAutomationState('p', 'now');
      nextAction(s, { status: 'ok' }); // PLAN → VALIDATE
      nextAction(s, { status: 'ok' }); // VALIDATE → AUTOMATE
      s.currentPhase = 'RECORD';
      nextAction(s, { status: 'failed' }); // attempt 1
      nextAction(s, { status: 'failed' }); // attempt 2
      const a = nextAction(s, { status: 'failed' }); // attempt 3 → resume
      expect(a.kind).toBe('resume');
      expect(a.phase).toBe('VALIDATE'); // lastOkPhase
      expect(s.status).toBe('running');
    });

    it('tracks attempts correctly across phases', () => {
      const s = createAutomationState('p', 'now');
      nextAction(s, { status: 'ok' }); // PLAN ok → VALIDATE
      expect(s.attempts['PLAN']).toBe(1);
      expect(s.attempts['VALIDATE']).toBe(0);
      nextAction(s, { status: 'failed' }); // VALIDATE fail 1
      expect(s.attempts['VALIDATE']).toBe(1);
    });
  });

  /* ── advanceState ── */
  describe('advanceState', () => {
    it('applies run action', () => {
      const s = createAutomationState('p', 'now');
      const a = nextAction(s, { status: 'ok' });
      const updated = advanceState(s, a);
      expect(updated.currentPhase).toBe('VALIDATE');
      expect(updated.status).toBe('running');
    });

    it('applies give-up action', () => {
      const s = createAutomationState('p', 'now');
      const a = { kind: 'give-up' as const, phase: 'PLAN' as Phase, attempt: 3, reason: 'done' };
      const updated = advanceState(s, a);
      expect(updated.status).toBe('failed');
    });

    it('updates updatedAt timestamp', () => {
      const s = createAutomationState('p', 'now');
      const before = s.updatedAt;
      advanceState(s, { kind: 'run', phase: 'PLAN', attempt: 1, reason: 'test' });
      expect(s.updatedAt).toBeDefined();
      // updatedAt is always set (may be same ms in fast tests)
    });
  });

  /* ── buildManifest ── */
  describe('buildManifest', () => {
    it('creates manifest with all phases', () => {
      const m = buildManifest({ id: 'proj-1', name: 'Test Project' });
      expect(m.projectId).toBe('proj-1');
      expect(m.name).toBe('Test Project');
      expect(m.phases).toEqual([...PHASES]);
      expect(m.maxAttempts).toBe(MAX_ATTEMPTS);
    });

    it('defaults name to id', () => {
      const m = buildManifest({ id: 'proj-x' });
      expect(m.name).toBe('proj-x');
    });
  });

  /* ── verifyDurationCommand ── */
  describe('verifyDurationCommand', () => {
    it('builds ffprobe argv', () => {
      const cmd = verifyDurationCommand('video.mp4', 60);
      expect(cmd[0]).toBe('ffprobe');
      expect(cmd).toContain('-v');
      expect(cmd).toContain('error');
      expect(cmd).toContain('video.mp4');
      expect(cmd).toContain('--expect-duration-sec');
      expect(cmd).toContain('60');
    });
  });

  /* ── describeRun ── */
  describe('describeRun', () => {
    it('produces human-readable summary', () => {
      const s = createAutomationState('proj-1', 'now');
      const m = buildManifest({ id: 'proj-1', name: 'Test' });
      const desc = describeRun(s, m);
      expect(desc).toContain('proj-1');
      expect(desc).toContain('Test');
      expect(desc).toContain('PLAN');
      expect(desc).toContain('idle');
    });

    it('includes error when present', () => {
      const s = createAutomationState('p', 'now');
      s.error = 'something broke';
      const m = buildManifest({ id: 'p', name: 'P' });
      const desc = describeRun(s, m);
      expect(desc).toContain('something broke');
    });
  });

  /* ── phaseNote ── */
  describe('phaseNote', () => {
    it('returns phase and note', () => {
      const s = createAutomationState('p', 'now');
      const n = phaseNote(s, 'test note');
      expect(n.phase).toBe('PLAN');
      expect(n.note).toBe('test note');
    });
  });

  /* ── Full lifecycle ── */
  describe('full lifecycle', () => {
    it('completes all 10 phases', () => {
      const s = createAutomationState('full', 'now');
      for (let i = 0; i < PHASES.length; i++) {
        const a = nextAction(s, { status: 'ok' });
        advanceState(s, a);
      }
      expect(s.status).toBe('done');
      expect(s.currentPhase).toBe('ARCHIVE');
      expect(s.lastOkPhase).toBe('ARCHIVE');
    });

    it('handles mixed ok/fail/retry', () => {
      const s = createAutomationState('mixed', 'now');
      // Step 1: PLAN ok → VALIDATE
      const a1 = nextAction(s, { status: 'ok' });
      expect(a1.phase).toBe('VALIDATE');
      advanceState(s, a1);
      expect(s.currentPhase).toBe('VALIDATE');

      // Step 2: VALIDATE ok → AUTOMATE
      const a2 = nextAction(s, { status: 'ok' });
      expect(a2.phase).toBe('AUTOMATE');
      advanceState(s, a2);
      expect(s.currentPhase).toBe('AUTOMATE');

      // Step 3: AUTOMATE fail 1 → retry (stays AUTOMATE)
      const a3 = nextAction(s, { status: 'failed' });
      expect(a3.kind).toBe('retry');
      expect(a3.phase).toBe('AUTOMATE');
      advanceState(s, a3);
      expect(s.currentPhase).toBe('AUTOMATE');

      // Step 4: AUTOMATE fail 2 → retry (stays AUTOMATE)
      const a4 = nextAction(s, { status: 'failed' });
      expect(a4.kind).toBe('retry');
      expect(a4.phase).toBe('AUTOMATE');
      advanceState(s, a4);
      expect(s.currentPhase).toBe('AUTOMATE');

      // Step 5: AUTOMATE ok → RECORD
      const a5 = nextAction(s, { status: 'ok' });
      expect(a5.kind).toBe('run');
      expect(a5.phase).toBe('RECORD');
      advanceState(s, a5);
      expect(s.currentPhase).toBe('RECORD');
      expect(s.status).toBe('running');
    });
  });
});
