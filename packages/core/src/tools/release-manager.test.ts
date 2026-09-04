import { describe, it, expect } from 'vitest';
import {
  parseCommitMessage,
  bumpVersion,
  detectBumpType,
  generateChangelog,
  checkReadiness,
  releaseManagerTool,
} from './release-manager';

describe('release-manager', () => {
  describe('parseCommitMessage', () => {
    it('parses feat commits', () => {
      const note = parseCommitMessage('feat(auth): add OAuth2 support');
      expect(note).not.toBeNull();
      expect(note!.type).toBe('feat');
      expect(note!.scope).toBe('auth');
      expect(note!.description).toBe('add OAuth2 support');
    });

    it('parses fix commits', () => {
      const note = parseCommitMessage('fix: resolve memory leak in worker');
      expect(note).not.toBeNull();
      expect(note!.type).toBe('fix');
      expect(note!.scope).toBeUndefined();
    });

    it('parses breaking changes', () => {
      const note = parseCommitMessage('feat(api)!: remove v1 endpoints');
      expect(note).not.toBeNull();
      expect(note!.type).toBe('breaking');
    });

    it('returns null for non-conventional commits', () => {
      const note = parseCommitMessage('random commit message');
      expect(note).toBeNull();
    });

    it('parses all commit types', () => {
      const types = ['feat', 'fix', 'chore', 'refactor', 'perf', 'test', 'docs', 'security'];
      for (const type of types) {
        const note = parseCommitMessage(`${type}: something`);
        expect(note).not.toBeNull();
        expect(note!.type).toBe(type);
      }
    });
  });

  describe('bumpVersion', () => {
    it('bumps major', () => {
      expect(bumpVersion('v1.2.3', 'major')).toBe('v2.0.0');
    });

    it('bumps minor', () => {
      expect(bumpVersion('v1.2.3', 'minor')).toBe('v1.3.0');
    });

    it('bumps patch', () => {
      expect(bumpVersion('v1.2.3', 'patch')).toBe('v1.2.4');
    });

    it('bumps prerelease', () => {
      expect(bumpVersion('v1.2.3', 'prerelease')).toBe('v1.2.4-next.0');
    });

    it('handles version without v prefix', () => {
      expect(bumpVersion('1.2.3', 'patch')).toBe('v1.2.4');
    });
  });

  describe('detectBumpType', () => {
    it('detects major from breaking', () => {
      const notes = [{ type: 'breaking' as const, description: 'x' }];
      expect(detectBumpType(notes)).toBe('major');
    });

    it('detects minor from feat', () => {
      const notes = [{ type: 'feat' as const, description: 'x' }];
      expect(detectBumpType(notes)).toBe('minor');
    });

    it('defaults to patch', () => {
      const notes = [{ type: 'fix' as const, description: 'x' }];
      expect(detectBumpType(notes)).toBe('patch');
    });
  });

  describe('generateChangelog', () => {
    it('generates changelog with sections', () => {
      const notes = [
        { type: 'feat' as const, scope: 'auth', description: 'add login' },
        { type: 'fix' as const, description: 'fix crash' },
        { type: 'breaking' as const, description: 'remove v1' },
      ];
      const changelog = generateChangelog('v2.0.0', notes);
      expect(changelog).toContain('## v2.0.0');
      expect(changelog).toContain('### Breaking');
      expect(changelog).toContain('### Features');
      expect(changelog).toContain('### Fixes');
      expect(changelog).toContain('remove v1');
      expect(changelog).toContain('**auth:** add login');
    });
  });

  describe('checkReadiness', () => {
    it('passes when all checks pass', () => {
      const checks = checkReadiness({
        hasTests: true, testsPassing: true,
        hasLint: true, lintPassing: true,
        hasBuild: true, buildPassing: true,
        hasSecurityScan: true, securityClean: true,
        hasChangelog: true, hasVersion: true,
        openBugs: 0,
      });
      expect(checks.every((c: any) => c.status === 'pass')).toBe(true);
    });

    it('fails when tests fail', () => {
      const checks = checkReadiness({
        hasTests: true, testsPassing: false,
      });
      const testCheck = checks.find((c: any) => c.name === 'Tests');
      expect(testCheck!.status).toBe('fail');
    });

    it('warns when no tests', () => {
      const checks = checkReadiness({ hasTests: false });
      const testCheck = checks.find((c: any) => c.name === 'Tests');
      expect(testCheck!.status).toBe('warn');
    });
  });

  describe('releaseManagerTool', () => {
    it('plans a release', async () => {
      const result = await releaseManagerTool({
        action: 'plan',
        version: 'v1.0.0',
        commits: ['feat: new feature', 'fix: bug fix'],
      }) as any;
      expect(result.version).toBe('v1.1.0');
      expect(result.type).toBe('minor');
      expect(result.changelog).toContain('Features');
    });

    it('generates changelog', async () => {
      const result = await releaseManagerTool({
        action: 'changelog',
        version: 'v2.0.0',
        commits: ['feat!: breaking change', 'fix: small fix'],
      }) as any;
      expect(result).toContain('v2.0.0');
      expect(result).toContain('Breaking');
    });

    it('checks readiness', async () => {
      const result = await releaseManagerTool({
        action: 'readiness',
        readiness: { hasTests: true, testsPassing: true, hasBuild: true, buildPassing: true },
      }) as any;
      expect(result.checks).toBeDefined();
      expect(result.isReady).toBe(true);
    });

    it('bumps version', async () => {
      const result = await releaseManagerTool({
        action: 'bump',
        version: 'v1.0.0',
        bumpType: 'minor',
      }) as any;
      expect(result.bumped).toBe('v1.1.0');
    });
  });
});
