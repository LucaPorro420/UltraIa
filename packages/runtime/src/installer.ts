import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { UltraPaths, UltraConfig } from './config';
import type { UltraEventBus } from './event-bus';
import type { UltraLogger } from './logger';

export type ExecFn = (command: string, args: string[], opts?: { cwd?: string }) => Promise<{ code: number; stdout: string; stderr: string }>;

export interface InstallStep {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface InstallResult {
  ok: boolean;
  steps: InstallStep[];
  error?: string;
  rolledBack?: boolean;
}

export interface InstallerOptions {
  projectRoot: string;
  ultraiaRoot: string;
  envExamplePath?: string;
  /** Injectable command runner (tests). Default: real spawn. */
  exec?: ExecFn;
  /** Skip network/npm steps (offline install). Default false. */
  offline?: boolean;
  logger?: UltraLogger;
  events?: UltraEventBus;
}

export interface PrereqResult {
  ok: boolean;
  checks: Record<string, { ok: boolean; found?: string; detail?: string }>;
}

function defaultExec(): ExecFn {
  return (command, args, opts) =>
    new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: opts?.cwd,
        shell: process.platform === 'win32',
        windowsHide: true,
      });
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (d: Buffer) => (stdout += d.toString()));
      child.stderr?.on('data', (d: Buffer) => (stderr += d.toString()));
      child.on('error', reject);
      child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    });
}

function npmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function nodeCommand(): string {
  return process.platform === 'win32' ? 'node.exe' : 'node';
}

/**
 * Local installer: prereqs → dirs → env → deps → db → config → health → state.
 * Never destructive: uninstall keeps user data (dev.db, .ultraia) unless told
 * otherwise; update backs up first and rolls back when health fails.
 */
export class Installer {
  private readonly projectRoot: string;
  private readonly ultraiaRoot: string;
  private readonly envExamplePath: string;
  private readonly exec: ExecFn;
  private readonly offline: boolean;
  private readonly logger?: UltraLogger;
  private readonly events?: UltraEventBus;

  constructor(options: InstallerOptions) {
    this.projectRoot = options.projectRoot;
    this.ultraiaRoot = options.ultraiaRoot;
    this.envExamplePath = options.envExamplePath ?? path.join(options.projectRoot, '.env.example');
    this.exec = options.exec ?? defaultExec();
    this.offline = options.offline ?? false;
    this.logger = options.logger;
    this.events = options.events;
  }

  private log(message: string): void {
    this.logger?.info('INSTALL', message);
  }

  private step(name: string, ok: boolean, detail?: string): InstallStep {
    return { name, ok, detail };
  }

  /** Checks node version + optional python (matching start.py semantics). */
  async checkPrereqs(): Promise<PrereqResult> {
    const checks: PrereqResult['checks'] = {};
    const node = await this.exec(nodeCommand(), ['--version']);
    checks.node = {
      ok: node.code === 0,
      found: node.stdout.trim(),
      detail: node.code !== 0 ? 'node not found' : undefined,
    };
    if (checks.node.ok) {
      const major = parseInt(node.stdout.trim().replace(/^v/, '').split('.')[0] ?? '0', 10);
      checks.node.ok = major >= 20;
      checks.node.detail = checks.node.ok ? undefined : `node >= 20 required, found ${major}`;
    }
    const python = await this.exec('python', ['--version']).catch(() => ({ code: 1, stdout: '', stderr: '' }));
    checks.python = {
      ok: python.code === 0,
      found: python.stdout.trim() || undefined,
      detail: python.code !== 0 ? 'python not found (optional)' : undefined,
    };
    const ok = Object.values(checks).every((c) => c.ok);
    return { ok, checks };
  }

  /** Full install: prereqs → dirs → env → deps → db → config → health → state. */
  async install(opts: { skipDeps?: boolean; skipDb?: boolean } = {}): Promise<InstallResult> {
    const steps: InstallStep[] = [];
    const fail = (name: string, error: string): InstallResult => {
      steps.push(this.step(name, false, error));
      this.events?.emit('install.failed', { error });
      return { ok: false, steps, error };
    };
    this.events?.emit('install.started');

    const prereqs = await this.checkPrereqs();
    steps.push(this.step('prereqs', prereqs.ok, Object.entries(prereqs.checks).map(([k, v]) => `${k}=${v.ok ? 'ok' : v.detail}`).join(', ')));
    if (!prereqs.ok) return fail('prereqs', 'node >= 20 required');

    const ultra = new UltraPaths(this.ultraiaRoot);
    ultra.ensure();
    steps.push(this.step('directories', true));

    const envTarget = path.join(this.projectRoot, '.env');
    if (fs.existsSync(this.envExamplePath) && !fs.existsSync(envTarget)) {
      fs.copyFileSync(this.envExamplePath, envTarget);
      steps.push(this.step('env', true, 'created .env from example'));
    } else {
      steps.push(this.step('env', true, fs.existsSync(envTarget) ? 'already present (untouched)' : 'no example available'));
    }

    if (!opts.skipDeps && !this.offline) {
      const hasModules = fs.existsSync(path.join(this.projectRoot, 'node_modules'));
      if (hasModules) {
        steps.push(this.step('deps', true, 'node_modules present'));
      } else {
        const deps = await this.exec(npmCommand(), ['install', '--no-audit', '--no-fund'], { cwd: this.projectRoot });
        steps.push(this.step('deps', deps.code === 0, deps.code !== 0 ? deps.stderr.slice(0, 300) : undefined));
        if (deps.code !== 0) return fail('deps', deps.stderr.slice(0, 300));
      }
    } else {
      steps.push(this.step('deps', true, 'skipped'));
    }

    if (!opts.skipDb) {
      const dbPath = path.join(this.projectRoot, 'packages', 'core', 'prisma', 'dev.db');
      if (fs.existsSync(dbPath)) {
        steps.push(this.step('database', true, 'dev.db present'));
      } else {
        const migrate = await this.exec(npmCommand(), ['run', 'db:migrate', '--', '--name', 'desktop_init'], { cwd: this.projectRoot });
        steps.push(this.step('database', migrate.code === 0, migrate.code !== 0 ? migrate.stderr.slice(0, 300) : undefined));
        if (migrate.code !== 0) return fail('database', migrate.stderr.slice(0, 300));
      }
    } else {
      steps.push(this.step('database', true, 'skipped'));
    }

    const config = new UltraConfig({ configDir: ultra.config });
    if (!config.has('installedAt')) {
      config.set('installedAt', new Date().toISOString());
      config.set('installVersion', '0.1.0');
      config.save();
    }
    steps.push(this.step('config', true));

    const stateDir = ultra.state;
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(stateDir, 'install.json'),
      JSON.stringify({ ok: true, at: new Date().toISOString(), version: '0.1.0' }, null, 2),
      'utf8',
    );
    steps.push(this.step('state', true));

    this.log('install complete');
    this.events?.emit('install.completed', { steps });
    return { ok: true, steps };
  }

  /** Copies database + config + memory entries into .ultraia/backups/<ts>/. */
  async backup(): Promise<string | undefined> {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(this.ultraiaRoot, 'backups', stamp);
    fs.mkdirSync(dest, { recursive: true });
    const dbPath = path.join(this.projectRoot, 'packages', 'core', 'prisma', 'dev.db');
    const copied: string[] = [];
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, path.join(dest, 'dev.db'));
      copied.push('dev.db');
    }
    const configFile = path.join(this.ultraiaRoot, 'config', 'config.json');
    if (fs.existsSync(configFile)) {
      fs.mkdirSync(path.join(dest, 'config'), { recursive: true });
      fs.copyFileSync(configFile, path.join(dest, 'config', 'config.json'));
      copied.push('config.json');
    }
    const memoryFile = path.join(this.ultraiaRoot, 'memory', 'entries.json');
    if (fs.existsSync(memoryFile)) {
      fs.mkdirSync(path.join(dest, 'memory'), { recursive: true });
      fs.copyFileSync(memoryFile, path.join(dest, 'memory', 'entries.json'));
      copied.push('entries.json');
    }
    this.log(`backup created: ${dest} (${copied.join(', ') || 'nothing to copy'})`);
    return copied.length > 0 ? dest : undefined;
  }

  /** Uninstall: backup + remove runtime dirs. User data is kept by default. */
  async uninstall(opts: { keepData?: boolean } = {}): Promise<InstallResult> {
    const keepData = opts.keepData ?? true;
    const steps: InstallStep[] = [];
    const backupDest = await this.backup();
    steps.push(this.step('backup', true, backupDest ?? 'nothing to back up'));

    if (!keepData) {
      fs.rmSync(this.ultraiaRoot, { recursive: true, force: true });
      steps.push(this.step('runtime-dirs', true, 'removed .ultraia'));
    } else {
      steps.push(this.step('runtime-dirs', true, 'kept user data in .ultraia'));
    }
    fs.rmSync(path.join(this.ultraiaRoot, 'state', 'install.json'), { force: true });
    this.events?.emit('install.uninstalled', { keepData });
    return { ok: true, steps };
  }

  /** Repair: backup → re-run install (never touches existing .env values). */
  async repair(): Promise<InstallResult> {
    const backupDest = await this.backup();
    const result = await this.install();
    return { ...result, steps: [{ name: 'backup', ok: true, detail: backupDest ?? 'nothing to back up' }, ...result.steps] };
  }

  /** Update: backup → install → health → rollback on failure. */
  async update(opts: { skipDeps?: boolean } = {}): Promise<InstallResult> {
    const backupDest = await this.backup();
    const result = await this.install({ skipDeps: opts.skipDeps });
    if (!result.ok && backupDest) {
      this.restoreBackup(backupDest);
      return { ...result, rolledBack: true };
    }
    return { ...result, steps: [{ name: 'backup', ok: true, detail: backupDest ?? 'nothing to back up' }, ...result.steps] };
  }

  private restoreBackup(dest: string): void {
    const dbPath = path.join(this.projectRoot, 'packages', 'core', 'prisma', 'dev.db');
    const dbBackup = path.join(dest, 'dev.db');
    if (fs.existsSync(dbBackup)) fs.copyFileSync(dbBackup, dbPath);
    this.log('rolled back database from backup');
  }
}