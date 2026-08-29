import { describe, it, expect, vi } from 'vitest';
import { planSandboxExecution, executeSandbox, resolveSandboxConfig } from './sandbox';

describe('sandbox — Fase B (E2B port)', () => {
  it('resolveSandboxConfig defaults', () => {
    const c = resolveSandboxConfig({});
    expect(c.e2bUrl).toBe('https://api.e2b.dev');
    expect(c.timeoutMs).toBe(30000);
  });

  it('planSandboxExecution local sin key', () => {
    const prev = process.env.E2B_API_KEY;
    delete process.env.E2B_API_KEY;
    const p = planSandboxExecution({ lang: 'python', code: 'print(1)' });
    expect(p.provider).toBe('local');
    expect(p.reason).toMatch(/sin E2B_API_KEY/);
    if (prev) process.env.E2B_API_KEY = prev;
  });

  it('planSandboxExecution e2b con key', () => {
    const prev = process.env.E2B_API_KEY;
    process.env.E2B_API_KEY = 'e2b_test';
    const p = planSandboxExecution({ lang: 'javascript', code: 'console.log(1)' });
    expect(p.provider).toBe('e2b');
    if (prev === undefined) delete process.env.E2B_API_KEY;
    else process.env.E2B_API_KEY = prev;
  });

  it('executeSandbox local no hace fetch', async () => {
    const prev = process.env.E2B_API_KEY;
    delete process.env.E2B_API_KEY;
    const mockFetch = vi.fn(async () => ({ ok: true, text: async () => '{}' }) as unknown as Response);
    const res = await executeSandbox({ lang: 'python', code: 'print(1)' }, {}, mockFetch as unknown as typeof fetch);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.provider).toBe('local');
      expect(res.stdout).toContain('[local plan]');
    }
    expect(mockFetch).not.toHaveBeenCalled();
    if (prev) process.env.E2B_API_KEY = prev;
  });

  it('executeSandbox e2b con mock', async () => {
    const prev = process.env.E2B_API_KEY;
    process.env.E2B_API_KEY = 'e2b_test';
    const mockFetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ stdout: 'hello', stderr: '', exitCode: 0 }) }) as unknown as Response);
    const res = await executeSandbox({ lang: 'python', code: 'print("hello")' }, {}, mockFetch as unknown as typeof fetch);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.provider).toBe('e2b');
      expect(res.stdout).toBe('hello');
    }
    expect(mockFetch).toHaveBeenCalledTimes(1);
    if (prev === undefined) delete process.env.E2B_API_KEY;
    else process.env.E2B_API_KEY = prev;
  });

  it('executeSandbox e2b fail-soft si status no ok', async () => {
    const prev = process.env.E2B_API_KEY;
    process.env.E2B_API_KEY = 'e2b_test';
    const mockFetch = vi.fn(async () => ({ ok: false, status: 401, text: async () => 'unauthorized' }) as unknown as Response);
    const res = await executeSandbox({ lang: 'python', code: 'x' }, {}, mockFetch as unknown as typeof fetch);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/401/);
    if (prev === undefined) delete process.env.E2B_API_KEY;
    else process.env.E2B_API_KEY = prev;
  });

  it('executeSandbox e2b fail-soft si fetch lanza', async () => {
    const prev = process.env.E2B_API_KEY;
    process.env.E2B_API_KEY = 'e2b_test';
    const badFetch = vi.fn(async () => { throw new Error('network down'); });
    const res = await executeSandbox({ lang: 'python', code: 'x' }, {}, badFetch as unknown as typeof fetch);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/network down/);
    if (prev === undefined) delete process.env.E2B_API_KEY;
    else process.env.E2B_API_KEY = prev;
  });

  it('validación de lang', () => {
    expect(() => planSandboxExecution({ lang: 'ruby' as unknown as 'python', code: 'x' })).toThrow();
  });
});
