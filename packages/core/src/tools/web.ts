import * as cheerio from 'cheerio';

export interface WebContent {
  url: string;
  finalUrl: string;
  title: string | null;
  siteName: string | null;
  author: string | null;
  description: string | null;
  ogImage: string | null;
  lang: string | null;
  text: string;
  fetchedAt: string;
}

const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 10_000;

function isPublicUrl(url: URL): boolean {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (host === '0.0.0.0' || host === '::1') return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const [a, b] = host.split('.').map(Number);
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }
  if (host.endsWith('.internal') || host.endsWith('.local')) return false;
  return true;
}

function absolutize(src: string | undefined, base: string): string | null {
  if (!src) return null;
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

function cleanText(raw: string): string {
  return raw
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 20_000);
}

/**
 * Fetch a public web page (website or non-private social post) and extract
 * readable text + metadata. Keyless, no API required. Includes an SSRF guard
 * (blocks private/loopback IPs and non-http(s) protocols).
 */
export async function fetchWebContent(input: string): Promise<WebContent> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Invalid URL');
  }
  if (!isPublicUrl(url)) throw new Error('URL is not allowed (only public http/https)');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'UltraIaBot/1.0 (+https://ultraia.example)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
  } catch (e) {
    clearTimeout(timer);
    throw new Error(`Fetch failed: ${(e as Error).message}`);
  }
  clearTimeout(timer);

  if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
  const finalUrl = res.url || url.toString();
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) throw new Error('Page too large to process');
  const html = Buffer.from(buf).toString('utf-8');

  const $ = cheerio.load(html);
  $('script, style, noscript, svg, iframe, nav, footer, header, form, aside').remove();

  const meta = (name: string) => $(`meta[property="${name}"], meta[name="${name}"]`).attr('content')?.trim() || null;
  const title = ($('title').first().text().trim() || meta('og:title') || meta('twitter:title')) || null;
  const siteName = meta('og:site_name');
  const author = meta('article:author') || meta('author');
  const description = meta('description') || meta('og:description') || null;
  const ogImage = absolutize((meta('og:image') || meta('twitter:image')) ?? undefined, finalUrl);

  const mainText = $('main').length ? $('main').text() : $('article').length ? $('article').text() : $('body').text();

  return {
    url: url.toString(),
    finalUrl,
    title,
    siteName,
    author,
    description,
    ogImage,
    lang: $('html').attr('lang')?.trim() || null,
    text: cleanText(mainText),
    fetchedAt: new Date().toISOString(),
  };
}
