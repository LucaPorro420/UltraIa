import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanText, scanFile, scanRepo, type SecurityFinding } from './security';

const AWS = 'AKIAIOSFODNN7EXAMPLE';
const GOOGLE = 'AIzaSyA1234567890abcdefghijklmnopqrstuv';
const GH = 'ghp_' + 'a'.repeat(36);
const PRIV = '-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBAK\n-----END RSA PRIVATE KEY-----';
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N';
const STRIPE = 'sk_live_' + 'b'.repeat(24);

describe('security.scanText', () => {
  it('detects critical AWS access key', () => {
    const f = scanText(`const k = "${AWS}";`);
    expect(f.some((x: SecurityFinding) => x.rule === 'aws_access_key' && x.severity === 'critical')).toBe(true);
    expect(f[0].line).toBe(1);
  });

  it('detects Google API key', () => {
    const f = scanText(`key=${GOOGLE}`);
    expect(f.some((x) => x.rule === 'google_api_key')).toBe(true);
  });

  it('detects GitHub token', () => {
    const f = scanText(`token: ${GH}`);
    expect(f.some((x) => x.rule === 'github_token')).toBe(true);
  });

  it('detects private key block', () => {
    const f = scanText(PRIV);
    expect(f.some((x) => x.rule === 'private_key')).toBe(true);
  });

  it('detects JWT', () => {
    const f = scanText(`Authorization: ${JWT}`);
    expect(f.some((x) => x.rule === 'jwt')).toBe(true);
  });

  it('detects Stripe live key', () => {
    const f = scanText(`const s = "${STRIPE}";`);
    expect(f.some((x) => x.rule === 'stripe_key')).toBe(true);
  });

  it('detects generic secret assignment (case-insensitive)', () => {
    const f = scanText(`const PASSWORD = "SUPERSECRET123"`);
    expect(f.some((x) => x.rule === 'generic_secret_assignment')).toBe(true);
  });

  it('returns [] for clean text', () => {
    const f = scanText('const greeting = "hello world";\nfunction add(a,b){return a+b;}\n');
    expect(f).toEqual([]);
  });

  it('flags one rule per line (no duplicate lines)', () => {
    const f = scanText(`line1 ${AWS}\nline2 ${GH}`);
    const lines = f.map((x) => x.line).sort();
    expect(lines).toEqual([1, 2]);
  });
});

describe('security.scanFile', () => {
  it('flags a committed real .env file (not .env.example)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sec-'));
    const envPath = join(dir, '.env');
    writeFileSync(envPath, `DB_PASSWORD=supersecret\nAWS_KEY=${AWS}\n`);
    const f = scanFile(envPath);
    expect(f.some((x) => x.rule === 'committed_env_file')).toBe(true);
    expect(f.some((x) => x.rule === 'aws_access_key')).toBe(true);
  });

  it('does NOT flag .env.example', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sec-'));
    const p = join(dir, '.env.example');
    writeFileSync(p, `API_KEY=your_key_here\n`);
    const f = scanFile(p);
    expect(f.some((x) => x.rule === 'committed_env_file')).toBe(false);
  });
});

describe('security.scanRepo', () => {
  it('walks a tree and finds secrets, skipping ignored dirs', () => {
    const root = mkdtempSync(join(tmpdir(), 'sec-'));
    writeFileSync(join(root, 'app.ts'), `const k="${GOOGLE}";\n`);
    mkdirSync(join(root, 'node_modules'));
    writeFileSync(join(root, 'node_modules', 'dep.js'), `const k="${AWS}";\n`);
    const f = scanRepo(root);
    expect(f.some((x) => x.rule === 'google_api_key')).toBe(true);
    // node_modules must be skipped
    expect(f.some((x) => x.rule === 'aws_access_key')).toBe(false);
  });

  it('skips binary extensions', () => {
    const root = mkdtempSync(join(tmpdir(), 'sec-'));
    writeFileSync(join(root, 'img.png'), AWS); // pretend binary contains pattern
    const f = scanRepo(root);
    expect(f.length).toBe(0);
  });
});
