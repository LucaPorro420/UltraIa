import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWebContent, isPublicUrl, assertPublicUrl } from './web';

const HTML = `<!doctype html><html lang="en"><head>
  <title>Example Page</title>
  <meta property="og:title" content="Example Page OG">
  <meta property="og:site_name" content="Example Site">
  <meta name="description" content="A page for testing.">
  <meta property="og:image" content="/img/cover.png">
  <meta name="author" content="Jane Doe">
</head><body>
  <nav>nav text</nav>
  <main><h1>Hello</h1><p>First paragraph.</p><p>Second paragraph with content.</p></main>
  <footer>footer</footer>
</body></html>`;

function mockFetch(finalUrl: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    url: finalUrl,
    arrayBuffer: () => Promise.resolve(Buffer.from(HTML)),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchWebContent', () => {
  it('extracts readable text and metadata', async () => {
    const fetchMock = mockFetch('https://example.com/page');
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchWebContent('https://example.com/page');
    expect(result.title).toBe('Example Page');
    expect(result.siteName).toBe('Example Site');
    expect(result.description).toBe('A page for testing.');
    expect(result.author).toBe('Jane Doe');
    expect(result.ogImage).toBe('https://example.com/img/cover.png');
    expect(result.lang).toBe('en');
    expect(result.text).toContain('First paragraph.');
    expect(result.text).not.toContain('nav text');
    expect(result.text).not.toContain('footer');
  });

  it('blocks private/loopback URLs without fetching', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchWebContent('http://localhost:3000/secret')).rejects.toThrow(/not allowed/i);
    await expect(fetchWebContent('http://192.168.0.1/')).rejects.toThrow(/not allowed/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects non-http(s) protocols', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchWebContent('file:///etc/passwd')).rejects.toThrow(/not allowed/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('isPublicUrl', () => {
  it('allows public URLs', () => {
    expect(isPublicUrl(new URL('https://example.com'))).toBe(true);
    expect(isPublicUrl(new URL('https://api.github.com/repos'))).toBe(true);
    expect(isPublicUrl(new URL('http://8.8.8.8/'))).toBe(true);
  });

  it('blocks localhost', () => {
    expect(isPublicUrl(new URL('http://localhost:3000/'))).toBe(false);
    expect(isPublicUrl(new URL('http://sub.localhost/'))).toBe(false);
  });

  it('blocks loopback', () => {
    expect(isPublicUrl(new URL('http://127.0.0.1/'))).toBe(false);
    expect(isPublicUrl(new URL('http://[::1]/'))).toBe(false);
  });

  it('blocks private IPs', () => {
    expect(isPublicUrl(new URL('http://10.0.0.1/'))).toBe(false);
    expect(isPublicUrl(new URL('http://172.16.0.1/'))).toBe(false);
    expect(isPublicUrl(new URL('http://192.168.1.1/'))).toBe(false);
  });

  it('blocks link-local', () => {
    expect(isPublicUrl(new URL('http://169.254.169.254/'))).toBe(false);
  });

  it('blocks .internal and .local', () => {
    expect(isPublicUrl(new URL('http://service.internal/'))).toBe(false);
    expect(isPublicUrl(new URL('http://machine.local/'))).toBe(false);
  });

  it('blocks non-http protocols', () => {
    expect(isPublicUrl(new URL('file:///etc/passwd'))).toBe(false);
    expect(isPublicUrl(new URL('ftp://example.com/'))).toBe(false);
  });
});

describe('assertPublicUrl', () => {
  it('passes for public URLs', () => {
    expect(() => assertPublicUrl('https://example.com')).not.toThrow();
  });

  it('throws for internal URLs', () => {
    expect(() => assertPublicUrl('http://localhost:3000/')).toThrow(/SSRF blocked/);
    expect(() => assertPublicUrl('http://169.254.169.254/')).toThrow(/SSRF blocked/);
    expect(() => assertPublicUrl('http://192.168.1.1/')).toThrow(/SSRF blocked/);
  });

  it('throws for invalid URLs', () => {
    expect(() => assertPublicUrl('not-a-url')).toThrow(/Invalid URL/);
  });
});
