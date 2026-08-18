# RAZONAMIENTO — libros-programacion-gratis (librosgratis.dev)

Fuente: enlaces.txt L826 → https://github.com/midudev/libros-programacion-gratis
(librosgratis.dev, catálogo curado por midudev). Descargado 18/08/2026 (curl; webfetch dio
429/timeout → `curl -sL` a `%TEMP%\opencode\libros-readme.md`, 20.225 bytes).
Fuente cruda commiteada: `learning/sources/libros-programacion-gratis.md`.
Implementación: capability `libros` en `packages/core/src/tools/libros.ts` (31 tests).

## Qué es

Catálogo open-source de **libros y tutoriales gratuitos de programación en español**,
con formato uniforme por sección: `[Título](url) — Autor · Formato`. El README declara
**115 recursos en 32 secciones** y las agrupa en 8 categorías. Incluye además reglas
explícitas para proponer nuevos recursos ("Cómo proponer un recurso": título, autor o
proyecto, enlace oficial, formato disponible, confirmación de que es gratuito y en español).

## Análisis del catálogo (datos verificados)

- **Integridad**: parseado el índice de secciones → 115/115 recursos, 32 secciones.
  Conteos por sección verificados contra el índice (JS 13, Python 13, TypeScript 7,
  Git 4, HTML/CSS 4, PHP 4, C++ 4, Rust 5, Blockchain 4, ...).
- **Discrepancia interna del README**: el resumen por categorías suma **114** (Fundamentos
  "13") mientras el índice suma **115** (Fundamentos real: 14). Regla: el **índice de
  secciones es la fuente fiel**; los conteos por categoría se COMPUTAN de los datos.
- **Dedupe correcto**: hay títulos repetidos legítimos (dos "Introducción a TypeScript",
  dos "El pequeño libro de ..." traducidos) → la clave única es **título + URL**, no título.
- **Formato heterogéneo**: mayoría PDF/HTML; combinaciones ("HTML, PDF"); algunos sin
  formato declarado (`undefined`); autor ausente en varios (notas `_..._` en el README).
- **URLs**: http(s) todas; 3 enlaces apuntan a mega.nz (cifrado), 1 a slideshare — se
  conservan tal cual del catálogo original (keyless-first: no se verifican en runtime).

## Mapeo implementado (port ORIGINAL del patrón, nada copiado)

| Fuente | Implementación |
|---|---|
| Catálogo 115 recursos / 32 secciones | `LIBROS` + `SECCIONES_LIBROS` (con descripciones) |
| Categorías (8) | `CATEGORIAS_LIBROS` + `categoriasLibros()` (conteos COMPUTADOS: lenguajes 15/71, frameworks 5/9, herramientas 3/8, bases-datos 2/6, plataformas 1/2, desarrollo-web 1/4, ia-datos 1/1, fundamentos 4/14) |
| Formato uniforme del índice | `FORMATOS_LIBRO` (PDF/HTML/ePub/eBook) + validación de combinaciones |
| Búsqueda natural | `buscarLibros(query, {seccion, formato, max})` — multi-término AND, accent-insensitive, score título 3 > autor 2 > sección 1, orden por score |
| Reglas "Cómo proponer un recurso" | `validarPropuestaLibro` (título ≥3, autor ≥2 si viene, URL http(s), formato válido o combinación, gratis + espanol obligatorios) |
| Acceso por sección | `librosPorSeccion(id|título)` + `normalizarSeccion` (case/accent-insensitive) |

## Wiring (registrado por la sesión concurrente r55 — NO duplicado)

- `ai/llm.ts`: capability `libros` → tool `libros_buscar` (acciones `buscar` / `seccion` /
  `categorias` / `proponer`, propuesta vía `propuestaJson`). Firma alineada: `buscarLibros(query, opts)`.
- `tools/index.ts`: import namespace `libros` + export en `tools` + `TOOL_DESCRIPTIONS.libros`.
- Este análisis se realizó de forma independiente; coincidió con la sesión r55 en la API
  (buscar por query + opts) — la implementación del dominio (115 entradas, scoring,
  validación, tests 31/31) es de esta iteración.

## Uso

```
libros_buscar { accion: "buscar", query: "python", seccion: "python" }   → 20 resultados
libros_buscar { accion: "seccion", seccion: "git" }                       → 4 recursos
libros_buscar { accion: "categorias" }                                    → 8 categorías computadas
libros_buscar { accion: "proponer", propuestaJson: "{...}" }              → ok/errores
```

## Pendiente (ninguno crítico)

- Los enlaces mega.nz/slideshare del catálogo no son verificables programáticamente —
  decisión de producto si se filtran o se mantienen (se mantienen: son parte del catálogo original).