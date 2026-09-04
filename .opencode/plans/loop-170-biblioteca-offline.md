# Plan — loop-170: App escritorio local offline "Biblioteca de aprendizaje" sobre TECH-LIBRARY

## Contexto
El usuario pide una app de escritorio **local, sin conexión**, que use `TECH-LIBRARY/` como
biblioteca de aprendizaje, con (a) los mejores métodos de aprendizaje **guiado**, (b) lectura
**libre** de todo el material por su cuenta, (c) **favoritos**, y (d) un apartado donde crear
**carpetas y subcarpetas** donde guardar información seleccionada **únicamente con titulación**
(cada guardado lleva título propio obligatorio).

Estado real verificado 04/09/2026:
- `TECH-LIBRARY/` YA es una biblioteca offline funcional: 22 `.md` canónicos en `01-..12-*/`
  + copia en `Completo/` + `INDEX.md` (manifiesto) + `index.html` autocontenido (Dark Obsidian,
  sidebar 280px, search, pills, cards con fav/read/notes en localStorage) + `generate.js` /
  `generate-unified.js` (generadores Node stdlib que leen `libros-data.json` externo).
- Decisión vigente Fase D (`desktopFase/DESKTOP_ARCHITECTURE.md` + `SHELL_DECISION.md` +
  plan `loop-134`): **WebView2 puro + launcher Node, NUNCA Electron** (durabilidad: WebView2 es
  evergreen con Edge; Electron arrastra Chromium propio y pesado). Launcher spike existe en
  `desktopFase/launcher/launcher.mjs`.
- Árbol git SUCIO (security batch 4 a medio commitear + varios `??` ajenos). Este plan NO toca
  nada de eso.

## Objetivo
Convertir `TECH-LIBRARY/` en una **app de escritorio offline de aprendizaje** con 5 modos que
cubren exactamente lo pedido, sin servidor, sin npm nuevo, sin red, reutilizando `index.html`
como base y abriéndola en ventana nativa WebView2 vía launcher existente:
1. **Biblioteca** (leer todo por tu cuenta) — lo que ya hace `index.html`.
2. **Guiado** (mejores métodos, 100% deterministas offline, sin LLM).
3. **Favoritos** (docs estrella + vista filtrada).
4. **Mi Cuaderno** (árbol carpetas/subcarpetas + fichas tituladas de extractos).
5. **Progreso** (dashboard local: leído / repasado / racha).

## SPEC (qué hace / qué no hace)
- SÍ: todo corre en `file://` (doble-click) o en ventana WebView2 `--app` (sin barra de navegador).
  Persistencia en `localStorage` namespaced `ultraia.biblio.*` + export/import `.json` (backup).
- SÍ: fuente de verdad = `TECH-LIBRARY/01-..12-*/**.md` (22 archivos). `Completo/` es copia de
  conveniencia, NO se edita a mano. `INDEX.md` es el manifiesto humano.
- SÍ: cada ficha del Cuaderno = `{titulo OBLIGATORIO, origenDoc, origenSeccion, cita (extracto
  seleccionado), notaPropia?}`. Sin título no se guarda. En la lista solo se muestra el título
  (detalle al expandir) → cumple "únicamente con titulación".
- SÍ: favoritos por documento (estrella) + vista "Solo favoritos".
- NO: sin cuentas, sin sync, sin backend, sin IA en MVP (los cuestionarios se generan por reglas
  deterministas desde los headings/bloques de cada `.md`; la IA local queda como Fase 2).
- NO: no se reescribe el lector actual; se EXTENDIÉ con pestañas/vistas nuevas en el mismo
  archivo autocontenido (cero bundler).

## DESIGN (sistema + UX, respeta Dark Obsidian de `index.html`)
- Tokens existentes (`--canvas #08080a`, `--panel #111115`, `--primary #8b5cf6`) + mismos
  componentes (sidebar, topbar, cards, pills). Sin framework nuevo: HTML+CSS+JS vanilla en el
  propio `index.html` (ya lo es: 462 líneas, todo inline).
- 5 vistas (tabs en sidebar, mismo patrón `.view.active` ya usado):
  `Biblioteca | Leer | Guiado | Favoritos | Mi Cuaderno | Progreso`.
- `Leer`: TOC por headings del doc + posición guardada + prev/next + botón "Guardar extracto →".
- `Guiado`: sesión = 5-10 tarjetas; cada tarjeta muestra pregunta → "Mostrar respuesta" →
  auto-calificación (Otra vez / Difícil / Bien / Fácil) + confianza 1-5 (metacognición).
- `Mi Cuaderno`: árbol `<ul>` recursivo (carpeta → subcarpetas → fichas); CRUD carpetas
  (renombrar/mover/borrar con confirmación); fichas colapsadas por título.
- Accesibilidad: todo usable solo con teclado (tab + enter), `prefers-reduced-motion` respeta el
  `scroll-behavior` existente.

## LEARN (métodos guiados elegidos — por qué estos 7, evidencia)
1. **Recuperación activa / testing effect** (Roediger & Karpicke): preguntar ANTES de mostrar la
   respuesta. Implementación: cada heading `##` del `.md` → pregunta automática
   (¿Qué es X? / ¿Para qué sirve X? / ¿Cómo se configura X?); bloques ``` → tarjeta
   "¿Qué hace este código?".
2. **Repetición espaciada SM-2 simplificado** (evolución pragmática de SuperMemo; FSRS completo
   se difiere: sobra para 22 docs y exige calibrar parámetros): caja 1→2→4→8→16 días; fallo
   vuelve a caja 1. 30 líneas JS en localStorage. Sin fechas servidas: `Date.now()` local.
3. **Interleaving** (Rohrer & Taylor): modo "Mezcla" que combina tarjetas de 2-3 categorías
   (ej. Frontend+Testing+Git) en vez de bloques puros.
4. **Feynman** (explica con tus palabras): tras cada respuesta, campo "Explícalo en 1 frase" que
   se guarda junto a la ficha; comparar con la cita original.
5. **Elaboración + ejemplo concreto**: cada tarjeta CONCEPT exige un ejemplo del propio material
   (el `.md` ya trae ejemplos UltraIa en cada ficha: "UltraIa Usage").
6. **Doble código (Paivio)**: cada tarjeta puede llevar un mini-diagrama ASCII/SVG del concepto
   (reutiliza el patrón `diagram` del repo solo como inspiración visual, sin código nuevo).
7. **Metacognición + racha**: confianza 1-5 por tarjeta + dashboard (leídos X/22, repasadas hoy,
   racha días, peores 5 tarjetas) → el usuario ve qué no sabe que no sabe.

## TECNOLOGÍAS EVALUADAS (decisión)
| Opción | Veredicto |
|---|---|
| Electron | RECHAZADO (Fase D ya lo descartó: pesado, Chromium propio, frágil a largo plazo) |
| Tauri 2 | DIFERIDO (bueno, pero exige toolchain Rust + WebView2 igual; overkill para 22 `.md`) |
| **WebView2 `--app` + launcher Node existente** | **ELEGIDO (Fase 1)**: `desktopFase/launcher` ya sabe abrir `msedge --app`; ventana nativa sin código nuevo pesado |
| Next.js `/biblioteca` | RECHAZADO para MVP (exige dev server; rompe "sin conexión / doble-click") |
| Prisma/SQLite | DIFERIDO Fase 2 (localStorage basta para <5 MB de fichas; migración documentada) |
| FSRS completo / LLM local | DIFERIDO Fase 2 (SM-2 simplificado cubre el MVP; sin GPU ni modelos) |

## Pasos (implementación futura, NO este ciclo)
1. `index.html`: añadir tabs Guiado/Cuaderno/Progreso + generador de tarjetas por reglas + SM-2 + árbol carpetas (todo inline, mismo archivo).
2. `TECH-LIBRARY/INDEX.md`: añadir sección "Cómo estudiar" (ruta guiada 01→12 + modo mezcla).
3. `desktopFase/launcher/`: flag `--biblio` que abre `TECH-LIBRARY/index.html` en `--app` (reutiliza proxy/token pattern, sin exponer FS).
4. Smoke manual offline: abrir por `file://`, sin red (devtools offline), recargar → persiste todo.

## ARCHIVOS A TOCAR (alcance cerrado, build futuro)
- `TECH-LIBRARY/index.html` (edit — ÚNICO archivo de código del MVP)
- `TECH-LIBRARY/INDEX.md` (edit — sección "Cómo estudiar")
- `desktopFase/launcher/launcher.mjs` (edit — flag `--biblio`, ~20 líneas)
- `.opencode/plans/loop-170-biblioteca-offline.md` (este plan)

## RECURSOS / PRESUPUESTO
- Deps nuevas: 0. Red: 0 (todo `file://` + localStorage). Disco: <2 MB (los `.md` ya existen).
- Esfuerzo estimado: S (2-3 sesiones cortas: 1 lector+guiado, 1 cuaderno+progreso, 1 launcher+pulido).
- Presupuesto ciclo build: tokens <60k, tiempo <45 min/sesión; early-exit si SM-2 supera 80 líneas.

## NO-hacer
- NO tocar `apps/web`, `packages/*`, `scripts/`, `desktop/*.csproj`, ni el WIP ajeno del `git status`
  (security batch + `??` concurrentes). NO `git add .` jamás.
- NO añadir deps npm, NO Prisma, NO servidor, NO fetch a nada (offline real).
- NO reescribir `generate*.js` (leen `libros-data.json` externo: documentar, no romper).
- NO duplicar `Completo/*.md` a mano (es copia; si diverge, gana `01-..12-`).
- NO push/merge sin aprobación humana (loop-constraints).

## Criterios de verificación
- Scoped (por iteración): `node --check` del JS extraído (si se separa a verificar) + smoke
  `file://` con red desactivada: leer doc, marcar fav, crear carpeta/subcarpeta+ficha titulada,
  sesión guiada 5 tarjetas, recargar → todo persiste; export/import `.json` round-trip.
- FULL (antes de commit): `npm run typecheck → lint → test → build` en orden CI con árbol
  cuarentenado si hay WIP ajeno; build solo con dev servers muertos. Gates TS quedan IGUAL que
  en `eeea668` (el MVP no toca `.ts`: typecheck/lint/test/build sin cambios esperados).
- Aceptación usuario: instala = copiar carpeta; usa = doble-click o launcher; desinstala = borrar.

## TOLERANCIAS
- SM-2 simplificado en MVP (FSRS solo si el usuario lo pide tras probar).
- Sin tests vitest en MVP (no hay `.ts` nuevo); la verificación es el smoke offline + gates FULL
  de no-regresión. Tests unitarios del SM-2/árbol llegan con la Fase 2 (módulo TS extraído).
- `dotnet` ausente aquí: el host C# existente no se toca; el launcher Node es lo que se verifica.

## Riesgos
- `generate.js` requiere `../libros-data.json` (ausente en repo) → NO usarlo en el MVP; documentar.
- Encoding: los generadores tienen mojibake (UTF-8 mal leído); el MVP edita `index.html` con tool
  Write (nunca `Set-Content`), preservando tildes.
- Divergencia `01-..12-` vs `Completo/` → regla: canónico `01-..12-`; reconciliar en Fase 2.
- localStorage lleno (>5 MB) → export/backup + aviso; migración SQLite en Fase 2.

## MEJORAS A ADICIONAR (Fase 2, fuera del MVP)
- Extraer motor SM-2 + árbol a `packages/core/src/tools/estudio.ts` con tests (reutilizable por agentes).
- FSRS real + modo examen cronometrado + mapas mentales SVG por doc.
- Importar `.md` propios del usuario (carpeta `TECH-LIBRARY/mis-docs/`).

## Predicción
- Gates npm: GREEN sin cambios (cero `.ts` tocados en MVP).
- Artefacto: `TECH-LIBRARY/index.html` extendido abre offline, guía sesiones, guarda favoritos y
  cuaderno titulado; launcher `--biblio` da ventana nativa.
- Commit explícito por archivo + NUNCA push sin aprobación.

## Prioridad / Esfuerzo
- Prioridad: P1 (valor directo al usuario, riesgo bajo, cero deuda arquitectónica).
- Esfuerzo: S. Paso siguiente: esperar "apruebo / ejecuta" del usuario → P-B implementa.
