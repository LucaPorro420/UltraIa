# Plan: Content Creation Pipeline Interno

## Contexto
UltraIa tiene 3 ebooks, 12 frameworks de curso (36+ lecciones), 5 learning paths, blog, y recursos.
El pipeline de publicación (topics → enrutador → present → publish) existe pero NO está conectado
con el contenido interno. El usuario pide iniciar la creación automática de contenido derivado.

## Objetivo
Crear un generador de contenido interno que convierta ebooks/curso/learning-paths en:
- Blog posts (markdown)
- Guiones para videos (YouTube Shorts / TikTok)
- Captions para redes sociales
- Thumbnails/descriptions para publicación

## Archivos a crear/modificar

### 1. `packages/core/src/tools/content-engine.ts` — Motor de contenido interno
- Lee el contenido existente (ebooks, courses, learning-paths)
- Genera derivados: blog post, guion de video, caption de redes
- Determinista, keyless, sin LLM
- Tool: `content_engine_generate(source, type, opts?)`

### 2. `apps/web/src/data/content-sources.ts` — Fuentes de contenido
- Exporta el contenido de ebooks/cursos como fuentes para el motor
- Tipos: `ContentSource`, `ContentType`

### 3. `packages/core/src/tools/content-templates.ts` — Plantillas de contenido
- Plantillas para blog post, guion de video, caption
- Deterministas, bilingües es/ar

### 4. Wiring en `llm.ts` + `index.ts`
- Registrar capability `content-engine`

## Criterios de verificación
1. `content_engine_generate(ebook, 'blog-post')` genera markdown válido
2. `content_engine_generate(lesson, 'video-script')` genera guion con hook + escenas
3. `content_engine_generate(framework, 'social-caption')` genera caption ≤280 chars
4. Tests: ≥15 tests nuevos
5. Gates: typecheck/lint/test/build verdes
