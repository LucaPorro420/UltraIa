# TAREA DIFERIDA — Conectar `video_edit` con UltraIA Cloud (guardar EDL/renders → `exports/`)

> **Estado**: ✅ **APLICADA** (17/08/2026) — con autorización explícita del usuario. Verificada
> con gates SCOPED: vitest 32/32 PASS + typecheck parcial 0 errores (grafo zod+cloud, sin tocar
> archivos de #25). Gates FULL pendientes hasta árbol limpio.
> **NOTA al aplicar**: `CloudService` no expone `read` (vive en el adapter) — los tests usan
> `cloud.adapter.read(...)` para releer el EDL.
> **Riesgo de conflicto**: MEDIO — añade una función a `packages/core/src/tools/video-edit.ts`.
> (territorio de la iteración 23; ninguna sesión concurrente lo toca HOY, pero es archivo compartido).
> **Regla**: NO aplicar hasta que `git status` esté limpio de sesiones concurrentes y los gates
> FULL corran verdes. Es el ÚLTIMO pendiente cloud de loop-25 (junto a TAREA-CLOUD-PUBLICATIONS.md).
>
> Fuente: `STATE.md`/AGENTS.md — pendiente loop-25: *"conectar `/cloud` con ... la capability
> `video_edit` (guardar EDL/renders)"*. También anotado en `docs/TAREA-WIRING-CLOUD.md` §6.

---

## 1) Objetivo

Cuando un pipeline `video_edit` produce un EDL + self-eval + timeline SVG (y opcionalmente un
render MP4), el resultado debe quedar **archivado en la nube personal** automáticamente:

- EDL (JSON) → `exports/edl/<nombre>.json`
- Self-eval (JSON) → `exports/edl/<nombre>.selfeval.json`
- Timeline (SVG) → `exports/edl/<nombre>.timeline.svg`
- Render MP4 (si el runner lo pasa) → `media/videos/<nombre>.mp4`

Beneficio: trazabilidad de cada edición (quién/quién decidió los cortes), respaldo offline
(`cloud-cli.py list exports/edl` lo ve) y base para re-publicar desde el cloud.

## 2) Verificado antes de escribir el parche (17/08/2026)

- `video-edit.ts` exports (grep verificado): `buildEdl` (línea 164), `selfEvalEdl` (324),
  `timelineViewSvg` (389), `renderFfmpeg` (234), `HARD_RULES` (54), tipos `Edl` (106),
  `SelfEvalReport` (310), `TimelineViewSpec` (374). Namespace final: `videoEdit` (458).
- `CloudService` (`tools/cloud.ts` 454-499): `upload(name, data: Uint8Array, targetPath?)` —
  igual que en TAREA-CLOUD-PUBLICATIONS.md.
- `CLOUD_LAYOUT` incluye `exports` ("Paquetes exportados (manifest, EDL, renders)") — la
  carpeta destino YA es canónica.
- La demo actual escribe en `resultTask/edl/` (runner TS `Task/video-edit-demo.ts`) — la tarea
  NO lo migra; solo añade el archivo de salida opcional en el cloud.

## 3) El parche — código exacto, comentado línea por línea

Archivo a tocar: **`packages/core/src/tools/video-edit.ts`** (añadir al final, antes del
namespace `videoEdit` o como export independiente — la tarea propone export independiente).

```ts
// ---------------------------------------------------------------------------
// Archivo en nube (UltraIA Cloud) — pendiente loop-25: guardar EDL/renders en exports/.
// ---------------------------------------------------------------------------

export interface CloudEditSaveInput {
  edl: Edl; // QUÉ ES: el cut list validado (buildEdl/selfEvalEdl). PARA QUÉ: es el artefacto principal a archivar.
  nombreBase: string; // QUÉ ES: slug base del archivo (p.ej. 'entrevista-2026-08-17'). PARA QUÉ: nombres estables y legibles.
  selfEval?: SelfEvalReport | null; // QUÉ ES: reporte del self-eval (opcional). PARA QUÉ: auditar la calidad de los cortes.
  timelineSvg?: string | null; // QUÉ ES: SVG compuesto de la edición (opcional). PARA QUÉ: vista previa sin abrir la app.
  renderMp4?: Uint8Array | null; // QUÉ ES: bytes del render final (opcional, lo produce el runner). PARA QUÉ: respaldo del entregable en media/videos.
}

export interface CloudEditSaveResult {
  saved: string[]; // QUÉ ES: paths canónicos guardados (p.ej. exports/edl/x.json).
  errors: string[]; // QUÉ ES: errores acumulados (fail-soft, no lanza).
  ok: boolean; // QUÉ ES: true si el EDL se guardó (artefacto mínimo) — el resto es best-effort.
}

/** Archiva los artefactos de una edición en el cloud. Fail-soft: nunca lanza. */
export async function guardarEdicionEnCloud(
  cloud: CloudService, // QUÉ ES: instancia ya resuelta (Local o R2), inyectada por el caller.
  input: CloudEditSaveInput, // QUÉ ES: artefactos a guardar.
): Promise<CloudEditSaveResult> {
  const saved: string[] = [];
  const errors: string[] = [];
  const dir = 'exports/edl'; // QUÉ ES: subcarpeta dentro de la carpeta canónica `exports`.
  // PARA QUÉ: agrupar todas las ediciones en un solo lugar del layout.
  // POR QUÉ: CLOUD_LAYOUT ya define `exports`; `edl` es una subcategoría natural (igual que media/videos).
  const enc = new TextEncoder(); // QUÉ ES: codificador UTF-8. PARA QUÉ: CloudService.upload exige Uint8Array.
  try {
    // QUÉ ES: el EDL es el artefacto OBLIGATORIO — si falla, ok=false (fail-soft igual).
    const edlBytes = enc.encode(JSON.stringify(input.edl, null, 2));
    const edlFile = await cloud.upload(`${input.nombreBase}.json`, edlBytes, dir);
    saved.push(edlFile.path);
  } catch (err) {
    errors.push(`EDL: ${err instanceof Error ? err.message : String(err)}`);
  }
  // QUÉ ES: self-eval opcional — un fallo aquí NO invalida la edición.
  if (input.selfEval) {
    try {
      const seBytes = enc.encode(JSON.stringify(input.selfEval, null, 2));
      const seFile = await cloud.upload(`${input.nombreBase}.selfeval.json`, seBytes, dir);
      saved.push(seFile.path);
    } catch (err) {
      errors.push(`self-eval: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  // QUÉ ES: timeline SVG opcional (texto plano → bytes UTF-8).
  if (input.timelineSvg) {
    try {
      const svgBytes = enc.encode(input.timelineSvg);
      const svgFile = await cloud.upload(`${input.nombreBase}.timeline.svg`, svgBytes, dir);
      saved.push(svgFile.path);
    } catch (err) {
      errors.push(`timeline: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  // QUÉ ES: render MP4 opcional → media/videos (clasificación automática del tipo video).
  if (input.renderMp4) {
    try {
      const mp4File = await cloud.upload(`${input.nombreBase}.mp4`, input.renderMp4, 'media/videos');
      saved.push(mp4File.path);
    } catch (err) {
      errors.push(`render: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  // QUÉ ES: ok = el EDL (artefacto mínimo) se guardó; los opcionales son best-effort.
  return { saved, errors, ok: saved.length > 0 && !saved.every((p) => p.includes('.mp4')) };
}
```

### 3.1 Import necesario en `video-edit.ts`

```ts
import type { CloudService } from './cloud'; // QUÉ ES: solo el TIPO (sin acoplar runtime).
// PARA QUÉ: la firma de guardarEdicionEnCloud recibe el cloud inyectado (patrón db/cloud inyectable).
// POR QUÉ: video-edit.ts sigue siendo puro/determinista — el cloud solo se usa si el caller lo pasa.
```

> NOTA: si `video-edit.ts` no tiene imports de `./cloud`, añadirlo arriba con los demás.
> No crea dependencia circular: `cloud.ts` no importa de `video-edit.ts`.

### 3.2 Uso sugerido en el runner (`Task/video-edit-demo.ts`, referencia)

```ts
// Después de generar edl.json / selfeval.json / timeline.svg en resultTask/edl/:
// const cloud = new CloudService({ adapter: new LocalCloudAdapter(process.env.ULTRAIA_CLOUD_DIR ?? join(process.cwd(), '.ultraia', 'cloud')) });
// const r = await guardarEdicionEnCloud(cloud, {
//   edl, nombreBase: 'download-2', selfEval: reporte, timelineSvg: svg,
// });
// console.log('cloud:', r.ok ? r.saved : r.errors); // fail-soft: nunca rompe la demo
```

## 4) Verificación obligatoria al aplicar (orden CI, árbol limpio)

```powershell
npm run typecheck   # 1
npm run lint        # 2
npm run test        # 3 — 29 tests video-edit + 27 cloud + resto deben pasar
npm run build       # 4 (matar antes dev servers: taskkill /T /F)
```

Tests nuevos sugeridos (`packages/core/src/tools/video-edit.test.ts`):
1. `guardarEdicionEnCloud guarda EDL + self-eval + timeline con InMemoryCloudAdapter` — assert
   paths `exports/edl/<nombre>.json` etc. y `ok === true`.
2. `guardarEdicionEnCloud con adapter caído es fail-soft` — adapter que lanza; `errors` poblado,
   `ok === false`, sin excepción propagada.
3. `guardarEdicionEnCloud con renderMp4 lo clasifica en media/videos` — path `media/videos/<nombre>.mp4`.

Staging explícito del commit (NUNCA `git add .`):
```powershell
git add packages/core/src/tools/video-edit.ts packages/core/src/tools/video-edit.test.ts
git commit -m "feat(video-edit): archivo de ediciones en UltraIA Cloud (EDL/self-eval/timeline/render a exports/ + media/videos, fail-soft)"
```

## 5) Por qué NO se aplicó ya

1. `video-edit.ts` es archivo compartido del paquete core — hoy lo tocan sesiones concurrentes
   (screenflow/automation en el mismo paquete); aplicar en paralelo arriesga conflicto.
2. Gates FULL no corren verdes hoy (archivos untracked de #25 rompen typecheck).
3. Regla del usuario (17/08/2026): adiciones a archivos existentes → tarea .md con código
   comentado (qué/para qué/por qué) para aplicar tras verificar.

**Señal para aplicar**: `git status --porcelain` sin archivos de sesiones concurrentes
(`automation*`, `recorder*`, `blueprint*`, `reach*`, `web-automation.py`, `shared/domain.ts`)
+ gates FULL verdes. Aplicar también `TAREA-CLOUD-PUBLICATIONS.md` en la misma ventana
(ambos dependen del mismo CloudService y dejan los pendientes cloud de loop-25 en cero).
