import { describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Installer } from './installer';

function tmpProject(): { project: string; ultra: string } {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ultraia-install-'));
  const project = path.join(base, 'project');
  const ultra = path.join(base, '.ultraia');
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, '.env.example'), 'DATABASE_URL="file:./dev.db"\nULTRAIA_PROVIDER="ollama"\n', 'utf8');
  fs.writeFileSync(path.join(project, 'package.json'), '{"name":"proj","private":true}', 'utf8');
  return { project, ultra };
}

function fakeExec(failOn?: string) {
  return vi.fn(async (command: string, args: string[]) => {
    const joined = `${command} ${args.join(' ')}`;
    if (failOn && args.join(' ').includes(failOn)) return { code: 1, stdout: '', stderr: 'simulated failure' };
    if (command.includes('node') || command.includes('npm')) return { code: 0, stdout: 'v20.0.0\n', stderr: '' };
    if (command === 'python') return { code: 0, stdout: 'Python 3.12.0\n', stderr: '' };
    return { code: 0, stdout: '', stderr: '' };
  });
}

describe('Installer', () => {
  it('checks prereqs (node >= 20 required, python optional)', async () => {
    const { project, ultra } = tmpProject();
    const installer = new Installer({ projectRoot: project, ultraiaRoot: ultra, exec: fakeExec() });
    const result = await installer.checkPrereqs();
    expect(result.ok).toBe(true);
    expect(result.checks.node.found).toBe('v20.0.0');
    expect(result.checks.python.ok).toBe(true);
  });

  it('fails prereqs when node is too old', async () => {
    const { project, ultra } = tmpProject();
    const exec = vi.fn(async (command: string) =>
      command.includes('node') ? { code: 0, stdout: 'v18.19.0\n', stderr: '' } : { code: 0, stdout: '', stderr: '' },
    );
    const installer = new Installer({ projectRoot: project, ultraiaRoot: ultra, exec });
    const result = await installer.checkPrereqs();
    expect(result.ok).toBe(false);
    expect(result.checks.node.detail).toContain('18');
  });

  it('performs a full install: dirs, env, deps, database, config, state', async () => {
    const { project, ultra } = tmpProject();
    const exec = fakeExec();
    const installer = new Installer({ projectRoot: project, ultraiaRoot: ultra, exec });
    const result = await installer.install();
    expect(result.ok).toBe(true);
    const stepNames = result.steps.map((s) => s.name);
    expect(stepNames).toEqual(['prereqs', 'directories', 'env', 'deps', 'database', 'config', 'state']);
    expect(fs.existsSync(path.join(project, '.env'))).toBe(true);
    expect(fs.existsSync(path.join(ultra, 'state', 'install.json'))).toBe(true);
    expect(fs.existsSync(path.join(ultra, 'config', 'config.json'))).toBe(true);
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('npm'), ['install', '--no-audit', '--no-fund'], expect.anything());
  });

  it('never overwrites an existing .env', async () => {
    const { project, ultra } = tmpProject();
    fs.writeFileSync(path.join(project, '.env'), 'DATABASE_URL="file:custom.db"\n', 'utf8');
    const installer = new Installer({ projectRoot: project, ultraiaRoot: ultra, exec: fakeExec() });
    const result = await installer.install();
    expect(result.ok).toBe(true);
    expect(fs.readFileSync(path.join(project, '.env'), 'utf8')).toContain('custom.db');
  });

  it('skips deps when node_modules is present', async () => {
    const { project, ultra } = tmpProject();
    fs.mkdirSync(path.join(project, 'node_modules'));
    const exec = fakeExec();
    const installer = new Installer({ projectRoot: project, ultraiaRoot: ultra, exec });
    const result = await installer.install();
    const depsStep = result.steps.find((s) => s.name === 'deps');
    expect(depsStep?.detail).toContain('present');
    expect(exec.mock.calls.some((c) => c[0].includes('npm') && c[1].includes('install'))).toBe(false);
  });

  it('skips db migrate when dev.db exists', async () => {
    const { project, ultra } = tmpProject();
    const prismaDir = path.join(project, 'packages', 'core', 'prisma');
    fs.mkdirSync(prismaDir, { recursive: true });
    fs.writeFileSync(path.join(prismaDir, 'dev.db'), 'sqlite', 'utf8');
    const exec = fakeExec();
    const installer = new Installer({ projectRoot: project, ultraiaRoot: ultra, exec });
    const result = await installer.install();
    expect(result.steps.find((s) => s.name === 'database')?.detail).toContain('present');
    expect(exec.mock.calls.some((c) => c.join(' ').includes('db:migrate'))).toBe(false);
  });

  it('reports failure when npm install fails', async () => {
    const { project, ultra } = tmpProject();
    const installer = new Installer({ projectRoot: project, ultraiaRoot: ultra, exec: fakeExec('install') });
    const result = await installer.install();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('simulated failure');
    expect(result.steps.some((s) => s.name === 'deps' && !s.ok)).toBe(true);
  });

  it('supports offline mode (skips network steps)', async () => {
    const { project, ultra } = tmpProject();
    const exec = fakeExec();
    const installer = new Installer({ projectRoot: project, ultraiaRoot: ultra, exec, offline: true });
    const result = await installer.install();
    expect(result.ok).toBe(true);
    expect(result.steps.find((s) => s.name === 'deps')?.detail).toBe('skipped');
  });

  it('creates a backup of db + config + memory', async () => {
    const { project, ultra } = tmpProject();
    const prismaDir = path.join(project, 'packages', 'core', 'prisma');
    fs.mkdirSync(prismaDir, { recursive: true });
    fs.writeFileSync(path.join(prismaDir, 'dev.db'), 'db-bytes', 'utf8');
    fs.mkdirSync(path.join(ultra, 'config'), { recursive: true });
    fs.writeFileSync(path.join(ultra, 'config', 'config.json'), '{"x":1}', 'utf8');
    const installer = new Installer({ projectRoot: project, ultraiaRoot: ultra, exec: fakeExec() });
    const dest = await installer.backup();
    expect(dest).toBeDefined();
    expect(fs.readFileSync(path.join(dest!, 'dev.db'), 'utf8')).toBe('db-bytes');
    expect(fs.existsSync(path.join(dest!, 'config', 'config.json'))).toBe(true);
  });

  it('uninstall backs up and keeps user data by default', async () => {
    const { project, ultra } = tmpProject();
    fs.mkdirSync(path.join(ultra, 'config'), { recursive: true });
    fs.writeFileSync(path.join(ultra, 'config', 'config.json'), '{}', 'utf8');
    const installer = new Installer({ projectRoot: project, ultraiaRoot: ultra, exec: fakeExec() });
    const result = await installer.uninstall();
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(ultra, 'config', 'config.json'))).toBe(true);
    expect(fs.existsSync(path.join(ultra, 'backups'))).toBe(true);
  });

  it('uninstall removes runtime dirs when keepData=false', async () => {
    const { project, ultra } = tmpProject();
    const installer = new Installer({ projectRoot: project, ultraiaRoot: ultra, exec: fakeExec() });
    const result = await installer.uninstall({ keepData: false });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(ultra)).toBe(false);
  });

  it('update rolls back the database when install fails', async () => {
    const { project, ultra } = tmpProject();
    const prismaDir = path.join(project, 'packages', 'core', 'prisma');
    fs.mkdirSync(prismaDir, { recursive: true });
    fs.writeFileSync(path.join(prismaDir, 'dev.db'), 'original-db', 'utf8');
    const installer = new Installer({ projectRoot: project, ultraiaRoot: ultra, exec: fakeExec('install') });
    const result = await installer.update();
    expect(result.ok).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(fs.readFileSync(path.join(prismaDir, 'dev.db'), 'utf8')).toBe('original-db');
  });

  it('repair includes a backup step and succeeds', async () => {
    const { project, ultra } = tmpProject();
    const installer = new Installer({ projectRoot: project, ultraiaRoot: ultra, exec: fakeExec() });
    const result = await installer.repair();
    expect(result.ok).toBe(true);
    expect(result.steps[0].name).toBe('backup');
  });

  it('install is idempotent across runs', async () => {
    const { project, ultra } = tmpProject();
    const installer = new Installer({ projectRoot: project, ultraiaRoot: ultra, exec: fakeExec() });
    const first = await installer.install();
    const second = await installer.install();
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    const config = JSON.parse(fs.readFileSync(path.join(ultra, 'config', 'config.json'), 'utf8')) as { installedAt?: string };
    expect(config.installedAt).toBeDefined();
  });
});