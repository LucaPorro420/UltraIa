import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { UltraPaths, parseEnvFile, loadEnvFile, UltraConfig } from './config';

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ultraia-config-'));
}

describe('UltraPaths', () => {
  let root: string;
  beforeEach(() => {
    root = tmpRoot();
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('derives the canonical .ultraia layout', () => {
    const paths = new UltraPaths(root);
    expect(paths.config.endsWith('config')).toBe(true);
    expect(paths.logs.endsWith('logs')).toBe(true);
    expect(paths.memory.endsWith('memory')).toBe(true);
    expect(paths.all()).toHaveLength(9);
  });

  it('creates every directory idempotently', () => {
    const paths = new UltraPaths(root);
    paths.ensure();
    for (const dir of paths.all()) {
      expect(fs.existsSync(dir)).toBe(true);
    }
    paths.ensure();
    expect(fs.readdirSync(root).length).toBeGreaterThanOrEqual(9);
  });
});

describe('parseEnvFile', () => {
  it('parses KEY=VALUE with comments, blanks and quotes', () => {
    const env = parseEnvFile([
      '# comment',
      '',
      'A=1',
      'B="hello world"',
      "C='single'",
      'D=',
    ].join('\n'));
    expect(env).toEqual({ A: '1', B: 'hello world', C: 'single', D: '' });
  });

  it('ignores lines without =', () => {
    expect(parseEnvFile('JUST_A_WORD\n')).toEqual({});
  });
});

describe('loadEnvFile', () => {
  it('loads into process.env without overwriting existing values', () => {
    const file = path.join(tmpRoot(), '.env');
    fs.writeFileSync(file, 'ULTRAIA_TEST_LOADED=yes\nULTRAIA_TEST_KEEP=from-file\n', 'utf8');
    process.env.ULTRAIA_TEST_KEEP = 'from-process';
    const parsed = loadEnvFile(file);
    expect(parsed.ULTRAIA_TEST_LOADED).toBe('yes');
    expect(process.env.ULTRAIA_TEST_LOADED).toBe('yes');
    expect(process.env.ULTRAIA_TEST_KEEP).toBe('from-process');
    delete process.env.ULTRAIA_TEST_LOADED;
    delete process.env.ULTRAIA_TEST_KEEP;
  });

  it('returns {} for a missing file', () => {
    expect(loadEnvFile(path.join(tmpRoot(), 'nope.env'))).toEqual({});
  });
});

describe('UltraConfig', () => {
  let dir: string;
  beforeEach(() => {
    dir = tmpRoot();
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('gets and sets values with defaults', () => {
    const config = new UltraConfig({ configDir: dir, defaults: { port: 3000 } });
    expect(config.get('port')).toBe(3000);
    expect(config.get('missing', 'fallback')).toBe('fallback');
    config.set('mode', 'desktop');
    expect(config.get('mode')).toBe('desktop');
  });

  it('persists and reloads, masking secrets on disk', () => {
    const config = new UltraConfig({ configDir: dir });
    config.set('name', 'ultraia');
    config.set('apiToken', 'super-secret', true);
    config.save();
    const raw = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8')) as Record<string, unknown>;
    expect(raw.name).toBe('ultraia');
    expect(raw.apiToken).toBe('***');
    const reloaded = new UltraConfig({ configDir: dir });
    expect(reloaded.get('name')).toBe('ultraia');
    // Secrets are never persisted in config.json: the host stores them via the
    // OS keychain / env; after reload the value is masked.
    expect(reloaded.secret('apiToken')).toBe('***');
  });

  it('toPublicView masks secrets', () => {
    const config = new UltraConfig({ configDir: dir });
    config.set('apiToken', 'xyz', true);
    config.set('visible', 1);
    expect(config.toPublicView()).toEqual({ apiToken: '***', visible: 1 });
  });

  it('survives a corrupt config file', () => {
    fs.writeFileSync(path.join(dir, 'config.json'), '{not json', 'utf8');
    const config = new UltraConfig({ configDir: dir, defaults: { port: 4000 } });
    expect(config.get('port')).toBe(4000);
  });

  it('merge applies secrets', () => {
    const config = new UltraConfig({ configDir: dir });
    config.merge({ token: 't', pub: 'p' }, ['token']);
    expect(config.secret('token')).toBe('t');
    expect(config.get('pub')).toBe('p');
    expect(config.toPublicView().token).toBe('***');
  });
});