import { describe, it, expect } from 'vitest';
import {
  generateBlogPost,
  generateVideoScript,
  generateSocialCaption,
  generateThread,
  type ContentSource,
} from './content-templates';
import { generateDerivedContent, generateBatch } from './content-engine';

const SAMPLE_SOURCE: ContentSource = {
  id: 'test-threejs',
  title: 'Three.js Avanzado',
  description: 'Guía completa para crear experiencias 3D en el navegador.',
  topics: ['threejs', 'webgl', 'shaders'],
  level: 'Intermedio-Avanzado',
  category: 'Desarrollo Web',
  chapters: [
    'La escena mínima',
    'Geometrías y materiales',
    'Shaders GLSL',
    'Post-procesamiento',
  ],
};

const SAMPLE_COURSE: ContentSource = {
  id: 'test-react',
  title: 'React',
  description: 'Biblioteca para interfaces de usuario.',
  topics: ['react', 'hooks', 'frontend'],
  category: 'frontend',
  lessons: [
    { title: 'Setup con Vite', summary: 'Crea una app React.', durationMin: 20 },
    { title: 'JSX y componentes', summary: 'HTML en JavaScript.', durationMin: 25 },
    { title: 'Props y estado', summary: 'Gestiona datos.', durationMin: 30 },
  ],
};

describe('content-templates', () => {
  describe('generateBlogPost', () => {
    it('genera blog post en español', () => {
      const result = generateBlogPost(SAMPLE_SOURCE, 'es');
      expect(result.type).toBe('blog-post');
      expect(result.title).toContain('Three.js Avanzado');
      expect(result.body).toContain('#');
      expect(result.wordCount).toBeGreaterThan(50);
      expect(result.estimatedReadMin).toBeGreaterThanOrEqual(1);
    });

    it('genera blog post en árabe', () => {
      const result = generateBlogPost(SAMPLE_SOURCE, 'ar');
      expect(result.idioma).toBe('ar');
      expect(result.body).toContain('Three.js Avanzado');
    });

    it('usa chapters si están disponibles', () => {
      const result = generateBlogPost(SAMPLE_SOURCE, 'es');
      expect(result.body).toContain('La escena mínima');
      expect(result.body).toContain('Shaders GLSL');
    });

    it('usa lessons si no hay chapters', () => {
      const result = generateBlogPost(SAMPLE_COURSE, 'es');
      expect(result.body).toContain('Setup con Vite');
      expect(result.body).toContain('JSX y componentes');
    });

    it('incluye tags', () => {
      const result = generateBlogPost(SAMPLE_SOURCE, 'es');
      expect(result.tags).toContain('threejs');
      expect(result.tags).toContain('webgl');
    });
  });

  describe('generateVideoScript', () => {
    it('genera guion con hook y escenas', () => {
      const result = generateVideoScript(SAMPLE_SOURCE, 'es');
      expect(result.type).toBe('video-script');
      expect(result.body).toContain('Hook');
      expect(result.body).toContain('Escena');
      expect(result.body).toContain('CTA');
    });

    it('limita a 4 escenas', () => {
      const result = generateVideoScript(SAMPLE_SOURCE, 'es');
      const scenes = result.body.match(/Escena \d/g) || [];
      expect(scenes.length).toBeLessThanOrEqual(4);
    });

    it('genera en árabe', () => {
      const result = generateVideoScript(SAMPLE_SOURCE, 'ar');
      expect(result.idioma).toBe('ar');
      expect(result.body).toContain('مشهد');
    });
  });

  describe('generateSocialCaption', () => {
    it('genera caption ≤280 chars', () => {
      const result = generateSocialCaption(SAMPLE_SOURCE, 'es');
      expect(result.type).toBe('social-caption');
      expect(result.body.length).toBeLessThanOrEqual(280);
    });

    it('incluye emoji por categoría', () => {
      const result = generateSocialCaption(SAMPLE_SOURCE, 'es');
      expect(result.body).toMatch(/[\u{1F300}-\u{1F9FF}]/u);
    });

    it('incluye hashtags', () => {
      const result = generateSocialCaption(SAMPLE_SOURCE, 'es');
      expect(result.body).toContain('#');
    });
  });

  describe('generateThread', () => {
    it('genera thread con opener y cierre', () => {
      const result = generateThread(SAMPLE_SOURCE, 'es');
      expect(result.type).toBe('thread');
      expect(result.body).toContain('Hilo sobre');
      expect(result.body).toContain('Retuitea');
    });

    it('incluye numbering', () => {
      const result = generateThread(SAMPLE_SOURCE, 'es');
      expect(result.body).toContain('1/');
    });
  });
});

describe('content-engine', () => {
  it('generateDerivedContent genera blog post con manifest', async () => {
    const result = await generateDerivedContent(SAMPLE_SOURCE, {
      type: 'blog-post',
      idioma: 'es',
      dryRun: true,
    });
    expect(result.sourceId).toBe('test-threejs');
    expect(result.type).toBe('blog-post');
    expect(result.files).toHaveLength(1);
    expect(result.files[0].content.wordCount).toBeGreaterThan(0);
  });

  it('generateBatch genera múltiples contenidos', async () => {
    const result = await generateBatch([SAMPLE_SOURCE, SAMPLE_COURSE], {
      types: ['blog-post', 'social-caption'],
      idiomas: ['es'],
      dryRun: true,
    });
    expect(result.sources).toHaveLength(4); // 2 sources × 2 types
    expect(result.totalFiles).toBe(4);
    expect(result.totalWords).toBeGreaterThan(0);
  });

  it('generateBatch bilingüe', async () => {
    const result = await generateBatch([SAMPLE_SOURCE], {
      types: ['blog-post'],
      idiomas: ['es', 'ar'],
      dryRun: true,
    });
    expect(result.sources).toHaveLength(2);
    const idiomas = result.sources.map((s) => s.idioma);
    expect(idiomas).toContain('es');
    expect(idiomas).toContain('ar');
  });

  it('genera video script con duración estimada', async () => {
    const result = await generateDerivedContent(SAMPLE_SOURCE, {
      type: 'video-script',
      dryRun: true,
    });
    expect(result.files[0].content.estimatedReadMin).toBe(1); // ≤60s
  });

  it('genera social caption corto', async () => {
    const result = await generateDerivedContent(SAMPLE_SOURCE, {
      type: 'social-caption',
      dryRun: true,
    });
    expect(result.files[0].content.body.length).toBeLessThanOrEqual(280);
  });
});
