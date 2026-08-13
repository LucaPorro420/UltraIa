import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWebContent } from './web';

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
