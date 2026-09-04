import { describe, expect, it, vi, afterEach } from 'vitest';
import { readWeb, parseRss } from './reach';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('reach.readWeb — SSRF guard (H05)', () => {
  it('rejects localhost URLs', async () => {
    await expect(readWeb({ url: 'http://localhost:3000/secret' })).rejects.toThrow(/SSRF blocked/);
  });

  it('rejects private IP URLs', async () => {
    await expect(readWeb({ url: 'http://192.168.1.1/admin' })).rejects.toThrow(/SSRF blocked/);
    await expect(readWeb({ url: 'http://10.0.0.1/' })).rejects.toThrow(/SSRF blocked/);
    await expect(readWeb({ url: 'http://169.254.169.254/' })).rejects.toThrow(/SSRF blocked/);
  });

  it('rejects non-http protocols', async () => {
    await expect(readWeb({ url: 'file:///etc/passwd' })).rejects.toThrow(/Invalid URL/);
  });

  it('allows public URLs (mocked fetch)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('Title: Test\nDescription: desc\nHello world content here.'),
    }));
    const result = await readWeb({ url: 'https://example.com/' });
    expect(result.url).toBe('https://example.com/');
  });
});

describe('reach.parseRss — SSRF guard (H06)', () => {
  it('rejects localhost URLs', async () => {
    await expect(parseRss({ url: 'http://localhost:8080/feed.xml' })).rejects.toThrow(/SSRF blocked/);
  });

  it('rejects private IP URLs', async () => {
    await expect(parseRss({ url: 'http://172.16.0.1/rss' })).rejects.toThrow(/SSRF blocked/);
  });

  it('rejects non-http protocols', async () => {
    await expect(parseRss({ url: 'file:///etc/passwd' })).rejects.toThrow(/Invalid URL/);
  });
});
