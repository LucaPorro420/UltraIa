import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Canonical .ultraia/ directory layout (config/runtime/logs/cache/memory/modules/
 * models/projects/state). All paths derive from a single root so the whole
 * runtime can be relocated by changing one variable.
 */
export class UltraPaths {
  constructor(public readonly root: string) {}

  get config(): string {
    return path.join(this.root, 'config');
  }

  get runtime(): string {
    return path.join(this.root, 'runtime');
  }

  get logs(): string {
    return path.join(this.root, 'logs');
  }

  get cache(): string {
    return path.join(this.root, 'cache');
  }

  get memory(): string {
    return path.join(this.root, 'memory');
  }

  get modules(): string {
    return path.join(this.root, 'modules');
  }

  get models(): string {
    return path.join(this.root, 'models');
  }

  get projects(): string {
    return path.join(this.root, 'projects');
  }

  get state(): string {
    return path.join(this.root, 'state');
  }

  all(): string[] {
    return [
      this.config,
      this.runtime,
      this.logs,
      this.cache,
      this.memory,
      this.modules,
      this.models,
      this.projects,
      this.state,
    ];
  }

  /** Creates every directory under root (idempotent). */
  ensure(): void {
    fs.mkdirSync(this.root, { recursive: true });
    for (const dir of this.all()) fs.mkdirSync(dir, { recursive: true });
  }
}

/** Minimal .env parser (no dependency). Supports KEY="quoted value" and comments. */
export function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Loads a .env file into process.env WITHOUT overwriting existing values. */
export function loadEnvFile(filePath: string): Record<string, string> {
  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return {};
  }
  const parsed = parseEnvFile(content);
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return parsed;
}

export interface UltraConfigOptions {
  configDir?: string;
  defaults?: Record<string, unknown>;
}

/**
 * JSON-backed configuration stored under .ultraia/config/config.json.
 * Secrets are accepted but never echoed back through toJSON/getAll — they are
 * only accessible through the explicit secret() getter (host decides whether to
 * back them with the OS keychain).
 */
export class UltraConfig {
  private data: Record<string, unknown>;
  readonly file: string;
  private readonly secretKeys: Set<string>;

  constructor(opts: UltraConfigOptions = {}) {
    this.file = path.join(opts.configDir ?? '.', 'config.json');
    this.data = { ...(opts.defaults ?? {}) };
    this.secretKeys = new Set();
    if (fs.existsSync(this.file)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Record<string, unknown>;
        this.data = { ...this.data, ...parsed };
      } catch {
        // Corrupt config: keep defaults; the installer can run repair().
      }
    }
  }

  get<T>(key: string, fallback?: T): T | undefined {
    return (this.data[key] as T | undefined) ?? fallback;
  }

  set(key: string, value: unknown, secret = false): void {
    this.data[key] = value;
    if (secret) this.secretKeys.add(key);
    else this.secretKeys.delete(key);
  }

  secret(key: string): string | undefined {
    const value = this.data[key];
    return typeof value === 'string' ? value : undefined;
  }

  has(key: string): boolean {
    return key in this.data;
  }

  /** Persists to disk. Secret values are masked in the written file. */
  save(): void {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this.data)) {
      out[key] = this.secretKeys.has(key) ? '***' : value;
    }
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(out, null, 2), 'utf8');
  }

  /** Safe view for logging/UI: secrets replaced by a marker. */
  toPublicView(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this.data)) {
      out[key] = this.secretKeys.has(key) ? '***' : value;
    }
    return out;
  }

  merge(values: Record<string, unknown>, secrets: string[] = []): void {
    for (const [key, value] of Object.entries(values)) this.set(key, value, secrets.includes(key));
  }
}