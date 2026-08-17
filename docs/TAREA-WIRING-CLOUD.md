# TAREA DIFERIDA — Wiring de la capability `cloud` en `tools/index.ts`

> **Estado**: ✅ **SUPERADA / APLICADA POR OTRA SESIÓN** — commit `7315d4d` (17/08/2026, 12:41,
> autor LucaPorro420): "feat(core): capability cloud wiring - cloud_files tool en chatStream
> (adapter local/R2 por env) + export tools/index.ts" — 3 archivos, +87/-2.
> **NO RE-APLICAR**: las 5 adiciones ya existen en `index.ts` (verificado 17/08/2026):
> línea 22 `export * from './cloud';`, línea 43 `import { cloudTools } from './cloud';`,
> línea 45 `cloud: cloudTools` en el objeto `tools`, líneas 81-82 entrada en `TOOL_DESCRIPTIONS`,
> línea 106 `| 'cloud'` en la union `Capability`. `ai/llm.ts` también quedó en el mismo commit
> (imports + `resolveCloudAdapter()` + bloque `tools.cloud_files`).
>
> Este documento se conserva como **evidencia del parche propuesto** (idéntico al aplicado) y
> por si hubiera que rehacer el wiring tras un revert. Las secciones 1-2 son el parche original
> (se mantienen intactas como referencia); la verificación de la sección 3 ya no es necesaria
> para el wiring, pero sí para los **pendientes** de la sección 6.
>
> Fuente original: `STATE.md` High Priority — "WIRING DIFERIDO: capability `cloud` en llm.ts/index.ts
> pendiente de que #25 commitee".

---

## 1) Qué falta exactamente

`packages/core/src/tools/index.ts` (101 líneas, 5 secciones) debe ganar **4 adiciones**:

| # | Sección del archivo | Adición |
|---|---|---|
| A | Bloque `export * from '...'` (líneas 1-21) | `export * from './cloud';` |
| B | Bloque de imports (líneas 23-41) | `import { cloudTools } from './cloud';` |
| C | Objeto `tools` (línea 43) | `cloud: cloudTools,` |
| D | `TOOL_DESCRIPTIONS` (líneas 45-79) | entrada `cloud:` |
| E | Union `Capability` (líneas 81-101) | `\| 'cloud'` |

---

## 2) El parche — código exacto, comentado línea por línea

### A. `export * from './cloud';`

```ts
// ---------------------------------------------------------------------------
// A) EXPORT PÚBLICO (insertar como LÍNEA 22, justo después de:
//    `export * from './video-edit';`  — que hoy es la última del bloque)
// ---------------------------------------------------------------------------
export * from './cloud';
// QUÉ ES: re-exporta el módulo completo `tools/cloud.ts` (CloudService, adapters
//         Local/R2/InMemory, cloudFilesTool, createCloudFilesHandler, CLOUD_LAYOUT,
//         validadores puros, CloudError...).
// PARA QUÉ: hace que cualquier consumidor que haga `import { ... } from '@ultraia/core'`
//         (o `from '../tools'`) pueda usar la nube personal sin importar la ruta interna.
// POR QUÉ: es el patrón del archivo (los 21 módulos previos se exportan igual); sin esta
//         línea, `cloud` queda privado dentro del paquete y el wiring en llm.ts (que ya
//         existe) sería el único punto de entrada — los agentes externos no la verían.
```

### B. `import { cloudTools } from './cloud';`

```ts
// ---------------------------------------------------------------------------
// B) IMPORT DEL NAMESPACE DE TOOLS (insertar como LÍNEA 42, justo después de:
//    `import { screenflow } from './screenflow';`  — hoy la última del bloque)
// ---------------------------------------------------------------------------
import { cloudTools } from './cloud';
// QUÉ ES: trae el objeto `cloudTools = { cloud_files: cloudFilesTool }` (definido en
//         cloud.ts línea 557) al scope de index.ts.
// PARA QUÉ: poder colgarlo del objeto `tools` (paso C) y así exponer la capability
//         `cloud` bajo el namespace canónico del paquete.
// POR QUÉ: sigue el patrón de `present`/`publish`/`enrutador`/`diagram`/`videoEdit`/
//         `screenflow` (imports de objetos con nombre, no de namespace `*`), porque solo
//         necesitamos el sub-objeto `cloud_files`, no el módulo entero aquí.
```

### C. `cloud: cloudTools,` dentro del objeto `tools`

```ts
// ---------------------------------------------------------------------------
// C) OBJETO `tools` (línea 43 actual). Reemplazar la línea completa actual:
//    export const tools = { web, image, video, music, stitch, reach, skills: { runSkill }, content, g0dm0d3, topics, present: presentTools, publish, enrutador, mediaScore, metrics, memoryFs: { createMemoryFs }, diagram, videoEdit, screenflow };
//    por la misma línea + `, cloud: cloudTools` al final (antes del cierre):
// ---------------------------------------------------------------------------
export const tools = { web, image, video, music, stitch, reach, skills: { runSkill }, content, g0dm0d3, topics, present: presentTools, publish, enrutador, mediaScore, metrics, memoryFs: { createMemoryFs }, diagram, videoEdit, screenflow, cloud: cloudTools };
// QUÉ ES: añade la capability `cloud` (que contiene la tool `cloud_files`) al mapa
//         agregado de herramientas del paquete core.
// PARA QUÉ: los consumidores del objeto `tools` (ai/llm.ts, API routes, agentes admin)
//         pueden iterar/descubrir la capability como cualquiera de las otras 20.
// POR QUÉ: el registro de la tool en llm.ts ya existe (bloque `if (opts.tools?.includes('cloud'))`);
//         este paso solo hace que la capability sea descubrible de forma agregada, igual que
//         las demás — sin él, el objeto `tools` no la listaría y cualquier UI/endpoint que
//         enumere capabilities mostraría un hueco.
```

### D. Entrada en `TOOL_DESCRIPTIONS`

```ts
// ---------------------------------------------------------------------------
// D) TOOL_DESCRIPTIONS (insertar como LÍNEA 80, justo después de la entrada
//    `screenflow: '...'` — hoy la última del objeto, que cierra en línea 79)
// ---------------------------------------------------------------------------
  cloud:
    'UltraIA Cloud (personal file storage): canonical 9-folder layout (publications/drafts/briefs/media-videos/media-audio/media-images/scripts/exports/backups), safe-path validation (no ..\\ / nulls, lowercase canonical), 41 allowed extensions in 7 categories, 100 MiB upload cap, binary human sizes and a generated manifest.json. Backed by a local folder (ULTRAIA_CLOUD_DIR) or Cloudflare R2 via Worker (CLOUDFLARE_R2_WORKER_URL + CLOUDFLARE_R2_TOKEN). Use to store, browse and remove project media and deliverables.',
// QUÉ ES: la descripción documental de la capability (misma forma que las otras 20 entradas).
// PARA QUÉ: los LLM que consumen TOOL_DESCRIPTIONS (system prompt de agentes) saben cuándo
//         invocar `cloud_files` (guardar/leer media, thumbnails, EDL, paquetes de publicación).
// POR QUÉ: el tipo es `Record<string, string>` — sin esta entrada, la capability existiría
//         pero sin descripción (el modelo no sabría para qué usarla); además el test de
//         integridad de descripciones (si existe) fallaría con un hueco.
```

### E. Union `Capability`

```ts
// ---------------------------------------------------------------------------
// E) UNION `Capability` (líneas 81-101). Insertar `| 'cloud'` como ÚLTIMO miembro,
//    justo después de `| 'screenflow'` (línea 101 actual, antes del cierre `;`)
// ---------------------------------------------------------------------------
  | 'cloud'
// QUÉ ES: declara `'cloud'` como valor válido del tipo `Capability`.
// PARA QUÉ: los consumidores tipados (p.ej. `opts.tools?: Capability[]` en AiGateway)
//         aceptan `'cloud'` sin error de compilación — TypeScript lo exige.
// POR QUÉ: llm.ts ya hace `opts.tools?.includes('cloud')` con strings (no tipado), pero
//         cualquier consumer tipado rompería el typecheck si la unión no incluye `'cloud'`.
```

---

## 3) Verificación obligatoria antes de commitear la tarea

Orden CI estricto (idéntico al resto del repo), **solo cuando `git status` esté limpio de #25**:

```powershell
# 1. typecheck (tsc --noEmit core + web)
npm run typecheck
# 2. lint
npm run lint
# 3. tests core (deben pasar los 27 de cloud.test.ts + 462 restantes)
npm run test
# 4. build (matar antes cualquier dev server: taskkill /T /F sobre next dev/uvicorn)
npm run build
```

Chequeos específicos de esta tarea (dentro de `npm run test`):
- `cloud.test.ts` → `it('cloudFilesTool expone schema y descripción para llm.ts')` (línea 289) — ya existe y debe seguir PASS.
- `cloud.test.ts` → `it('createCloudFilesHandler: list/upload/read/remove/stat end-to-end')` (línea 295) — igual.

Staging explícito del commit de la tarea (NUNCA `git add .`):
```powershell
git add packages/core/src/tools/index.ts
git commit -m "feat(core): wiring capability cloud en tools/index.ts (export + tools + descripcion + Capability)"
```

---

## 4) Por qué NO se aplicó en esta sesión (y por qué se evitó el conflicto)

1. `tools/index.ts` es un archivo **compartido** — la sesión #25 (media-automation) iba a
   añadir sus tools al mismo bloque (líneas 1-21) y al objeto `tools` (línea 43). Aplicar el
   parche en paralelo habría causado conflicto de staging.
2. Los gates FULL (typecheck/lint/test/build) **no se podían correr verdes en el momento**:
   los archivos untracked de #25 rompían el typecheck si se corría junto. Aislarlos a `%TEMP%`
   para correr gates = alterar el proceso ajeno (prohibido por el usuario).
3. Regla del usuario (17/08/2026): *"Si tienes algo que agregar en algún archivo, guárdalo como
   tarea para realizarlo: crear un .md o pegar el código con indicaciones para luego verificarlo
   y adicionarlo o modificar el existente."* → se creó este documento en lugar de editar el archivo.

**Resultado**: la sesión concurrente aplicó el wiring por su cuenta en `7315d4d` (ver cabecera)
— el parche de este documento coincidía con el suyo, así que no hubo pérdida ni duplicación.

## 5) Trabajo ya realizado (no requiere acciones)

- `packages/core/src/ai/llm.ts` — wiring `cloud` COMPLETO (commit `7315d4d`):
  - línea 50: imports `cloudFilesTool, createCloudFilesHandler, LocalCloudAdapter, R2CloudAdapter, CloudStorageAdapter`
  - líneas 168-182: `resolveCloudAdapter()` (R2 si `CLOUDFLARE_R2_WORKER_URL`+`CLOUDFLARE_R2_TOKEN`, si no Local `ULTRAIA_CLOUD_DIR` → `.ultraia/cloud`)
  - líneas 870-876: `if (opts.tools?.includes('cloud')) { tools.cloud_files = tool({ ... createCloudFilesHandler(resolveCloudAdapter()) }) }`
- `packages/core/src/tools/index.ts` — export + tools + descripción + Capability (commit `7315d4d`)
- `apps/web/src/app/api/cloud/{status,files,upload}/route.ts` — API con auth ✅
- `apps/web/src/components/cloud-client.tsx` + página `/cloud` ✅
- `cloudflare/worker.ts` (R2 stateless) ✅
- `docs/CLOUD-FREE-2026.md` (guía verificada) ✅
- `scripts/cloud-cli.py` — **creado por esta sesión** (17/08/2026): CLI local stdlib para la
  nube (layout/list/upload/remove/stat/manifest/self-test), réplica del contrato de cloud.ts.
  Verificado: py_compile ✅, ruff ✅, pyflakes ✅, self-test 25/25 ✅, e2e en %TEMP% ✅.
  Pendiente de commit (esperar gates FULL del repo). Uso: `py -3.12 scripts/cloud-cli.py <cmd>`.

## 6) Pendiente futuro (fuera de esta tarea, anotado para el backlog)

- Commit de `scripts/cloud-cli.py` (+ este documento) cuando los gates FULL del repo estén verdes.
- Conectar `/cloud` con la cola `Publication` (subir paquete listo → `media/videos`).
- Conectar con `video_edit` (guardar EDL/renders → `exports/`).
- `docs/CLOUD-FREE-2026.md` Part 8: mini-guía de `cloud-cli.py`.
