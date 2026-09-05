import { describe, it, expect } from 'vitest';
import {
  planClone, extractFromHtml, generateSpecs, generateCloneOutput,
  cloneWebsiteTool, extractHtmlTool, generateComponentsTool,
  type CloneTarget, type ExtractedSection, type DesignTokens,
} from './website-clone';

describe('website-clone', () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; background: #08080a; color: #ffffff; }
        .hero { background: linear-gradient(135deg, #8b5cf6, #3b82f6); padding: 80px 0; }
        .btn { background: #8b5cf6; border-radius: 8px; }
      </style>
    </head>
    <body>
      <header class="nav">
        <a href="/">Home</a>
        <a href="/about">About</a>
      </header>
      <main>
        <section class="hero">
          <h1>Build with AI</h1>
          <p>The future of development is here</p>
          <img src="/images/hero.png" alt="Hero image" />
          <button class="btn">Get Started</button>
        </section>
        <section class="features">
          <h2>Features</h2>
          <div class="card">
            <img src="/images/feature1.svg" alt="Feature 1" />
            <h3>Fast</h3>
            <p>Lightning fast builds</p>
          </div>
          <div class="card">
            <img src="/images/feature2.svg" alt="Feature 2" />
            <h3>Smart</h3>
            <p>AI-powered optimization</p>
          </div>
        </section>
      </main>
      <footer>
        <p>&copy; 2026 UltraIa</p>
      </footer>
    </body>
    </html>
  `;

  describe('planClone', () => {
    it('creates a clone plan from a URL', () => {
      const target: CloneTarget = { url: 'https://example.com', fidelity: 'structural' };
      const plan = planClone(target);
      expect(plan.target.url).toBe('https://example.com');
      expect(plan.siteKey).toContain('example-com');
      expect(plan.pageKey).toMatch(/^page-[a-f0-9]+$/);
      expect(plan.route).toBe('/');
    });

    it('uses custom route when provided', () => {
      const target: CloneTarget = { url: 'https://example.com/docs', route: '/docs/clone', fidelity: 'pixel-perfect' };
      const plan = planClone(target);
      expect(plan.route).toBe('/docs/clone');
    });
  });

  describe('extractFromHtml', () => {
    it('extracts colors from HTML', () => {
      const result = extractFromHtml(sampleHtml, 'https://example.com');
      expect(Object.keys(result.tokens.colors).length).toBeGreaterThan(0);
      expect(result.tokens.colors['#08080a']).toBe('#08080a');
      expect(result.tokens.colors['#8b5cf6']).toBe('#8b5cf6');
    });

    it('extracts Google Fonts', () => {
      const result = extractFromHtml(sampleHtml, 'https://example.com');
      expect(result.tokens.fonts.length).toBeGreaterThan(0);
      expect(result.tokens.fonts[0].family).toBe('Inter');
      expect(result.tokens.fonts[0].source).toBe('google');
    });

    it('extracts sections from HTML', () => {
      const result = extractFromHtml(sampleHtml, 'https://example.com');
      expect(result.sections.length).toBeGreaterThan(0);
      const roles = result.sections.map(s => s.role);
      expect(roles).toContain('header');
      expect(roles).toContain('content');
      expect(roles).toContain('footer');
    });

    it('extracts images', () => {
      const result = extractFromHtml(sampleHtml, 'https://example.com');
      expect(result.assets.length).toBeGreaterThan(0);
      expect(result.assets.some(a => a.type === 'image')).toBe(true);
    });

    it('extracts inline SVGs count', () => {
      const htmlWithSvg = '<div><svg><path/></svg><svg><circle/></svg></div>';
      const result = extractFromHtml(htmlWithSvg, 'https://example.com');
      const svgAsset = result.assets.find(a => a.type === 'svg');
      expect(svgAsset).toBeDefined();
      expect(svgAsset!.src).toContain('2');
    });

    it('extracts text content', () => {
      const result = extractFromHtml(sampleHtml, 'https://example.com');
      expect(result.texts.length).toBeGreaterThan(0);
      expect(result.texts).toContain('Build with AI');
      expect(result.texts).toContain('The future of development is here');
    });

    it('handles empty HTML', () => {
      const result = extractFromHtml('', 'https://example.com');
      expect(result.sections.length).toBe(0);
      expect(result.assets.length).toBe(0);
    });

    it('resolves relative image URLs', () => {
      const result = extractFromHtml(sampleHtml, 'https://example.com');
      const heroImg = result.assets.find(a => a.alt === 'Hero image');
      expect(heroImg).toBeDefined();
      expect(heroImg!.src).toBe('https://example.com/images/hero.png');
    });
  });

  describe('generateSpecs', () => {
    it('generates specs from sections', () => {
      const { sections } = extractFromHtml(sampleHtml, 'https://example.com');
      const specs = generateSpecs(sections, 'example-com', 'page-abc');
      expect(specs.length).toBe(sections.length);
      expect(specs[0].targetFile).toContain('example-com');
      expect(specs[0].targetFile).toContain('page-abc');
    });

    it('capitalizes component names', () => {
      const { sections } = extractFromHtml(sampleHtml, 'https://example.com');
      const specs = generateSpecs(sections, 'site', 'page');
      expect(specs[0].name).toMatch(/^[A-Z]/);
    });
  });

  describe('generateCloneOutput', () => {
    it('generates full clone output', () => {
      const target: CloneTarget = { url: 'https://example.com', fidelity: 'structural' };
      const plan = planClone(target);
      const { sections, tokens, assets } = extractFromHtml(sampleHtml, 'https://example.com');
      const result = generateCloneOutput(plan, sections, tokens, tokens.fonts, assets);
      expect(result.components.length).toBeGreaterThan(0);
      expect(result.routeFile).toContain('import');
      expect(result.globalsFile).toContain('@import');
      expect(result.manifest.sourceUrl).toBe('https://example.com');
      expect(result.manifest.componentsCreated).toBe(result.components.length);
    });

    it('generates valid React component code', () => {
      const target: CloneTarget = { url: 'https://example.com', fidelity: 'structural' };
      const plan = planClone(target);
      const { sections, tokens } = extractFromHtml(sampleHtml, 'https://example.com');
      const result = generateCloneOutput(plan, sections, tokens, tokens.fonts, []);
      const first = result.components[0];
      expect(first.code).toContain('export function');
      expect(first.code).toContain('import React');
      expect(first.code).toContain('data-component');
    });

    it('generates route file with all component imports', () => {
      const target: CloneTarget = { url: 'https://example.com', fidelity: 'structural' };
      const plan = planClone(target);
      const { sections, tokens } = extractFromHtml(sampleHtml, 'https://example.com');
      const result = generateCloneOutput(plan, sections, tokens, tokens.fonts, []);
      for (const comp of result.components) {
        expect(result.routeFile).toContain(comp.name);
      }
    });
  });

  describe('tools', () => {
    it('clone_website tool returns plan', async () => {
      const result = await cloneWebsiteTool.execute({ url: 'https://example.com' });
      const parsed = JSON.parse(result);
      expect(parsed.status).toBe('plan_ready');
      expect(parsed.siteKey).toContain('example');
      expect(parsed.nextSteps.length).toBeGreaterThan(0);
    });

    it('extract_html tool parses HTML', async () => {
      const result = await extractHtmlTool.execute({ html: sampleHtml, url: 'https://example.com' });
      const parsed = JSON.parse(result);
      expect(parsed.tokens.fonts.length).toBeGreaterThan(0);
      expect(parsed.sections.length).toBeGreaterThan(0);
      expect(parsed.assets.length).toBeGreaterThan(0);
    });

    it('generate_clone_components tool produces code', async () => {
      const { sections, tokens } = extractFromHtml(sampleHtml, 'https://example.com');
      const result = await generateComponentsTool.execute({
        sections: JSON.stringify(sections),
        tokens: JSON.stringify(tokens),
        siteKey: 'example-com',
        pageKey: 'page-test',
        url: 'https://example.com',
      });
      const parsed = JSON.parse(result);
      expect(parsed.components.length).toBeGreaterThan(0);
      expect(parsed.routeFile).toContain('import');
      expect(parsed.manifest.componentsCreated).toBe(parsed.components.length);
    });
  });
});
