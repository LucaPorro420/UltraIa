# TAREA DIFERIDA — Conectar UltraIA Cloud con la cola `Publication` (loop-25 pendiente)

> **Estado**: ✅ **APLICADA** (17/08/2026, commit pendiente de esta sesión) — con autorización
> explícita del usuario ("apruebo todo lo que tengas y puedas hacer"). Aplicada con gates SCOPED
> (vitest 26/26 + typecheck parcial con tsconfig temporal; los archivos de #25 siguen sucios y
> rompen el FULL — se correrá cuando el árbol esté limpio).
> **CORRECCIÓN al aplicar**: `CloudService.upload` sin `targetPath` usa `drafts` (NO clasifica) →
> el helper pasa `targetPath` explícito vía `CLOUD_DIR_BY_EXT` (video→media/videos, audio→
> media/audio, imagen→media/images, otro→drafts) para respetar el layout canónico de CLOUD_LAYOUT.
> **Riesgo de conflicto**: ALTO — toca `packages/core/src/domain/publications.ts` (archivo
> compartido; la sesión #25 está editando archivos del mismo paquete).
> **Regla**: NO aplicar hasta que `git status --porcelain -- packages/core/src/tools/ packages/core/src/domain/`
> esté LIMPIO y los gates FULL del repo corran verdes.
>
> Fuente: `STATE.md`/AGENTS.md — pendiente loop-25: *"conectar `/cloud` con la cola `Publication`
> (subir paquete listo desde publicaciones → media/videos)"*. Anotado también en
> `docs/TAREA-WIRING-CLOUD.md` §6 y `docs/CLOUD-CLI-GUIDE.md` §4.2.

---

## 1) Objetivo

Cuando se crea una publicación en la cola (`createPublication`, AutoPub F4), el paquete
(`PublicationPackage`: texto + `media: string[]` + captions) debe quedar **respaldado en la
nube personal** automáticamente:

- `media/*` (videos/imágenes finales) → `media/videos/` (o la carpeta que clasifique su tipo).
- El paquete completo en JSON → `exports/publications/<id>.json` (traza auditable).
- **Fail-soft**: si una URL de media falla, la publicación NO se bloquea — se registran errores.

Esto da el flujo end-to-end: AutoPub produce → cloud respalda → `cloud-cli.py list` lo ve →
(próximo paso) publicación real desde el cloud.

## 2) Verificado antes de escribir el parche (17/08/2026)

- `CloudService` (`tools/cloud.ts` líneas 454-499) es público y ya valida/limita: `upload(name,
  data: Uint8Array, targetPath?)` (línea 470) — usa `sanitizeFileName` y `validateUpload` internos.
- `PublicationPackage` (`tools/present.ts` líneas 43-54): `media: string[]` (URLs) + `briefId` + `tema`.
- `createPublication` (`domain/publications.ts` líneas 45-66): patrón **db inyectable** — el cloud
  se inyectará igual (nunca `import` directo de singletons).
- `fetch` global está disponible (Node 18+/Next 15 runtime de los tests) — sin dep nueva.

## 3) El parche — código exacto, comentado línea por línea

Archivo a tocar: **`packages/core/src/domain/publications.ts`** (234 líneas hoy).

### 3.1 Imports (insertar tras la línea 19: `import { puntuarPaquete } from '../tools/media-score';`)

```ts
import type { CloudService } from '../tools/cloud'; // QUÉ ES: tipo del orquestador cloud (solo para firma).
// PARA QUÉ: createPublication recibe el cloud inyectado (opcional) sin acoplar el dominio a un adapter concreto.
// POR QUÉ: mismo patrón que `Db` inyectable — los tests pasan un InMemoryCloudAdapter; en runtime se
// resuelve con resolveCloudAdapter() desde llm.ts / rutas API.
```

### 3.2 Nuevo helper público (insertar entre la línea 42 —cierre de CreatePublicationResult— y la 44 —comentario de createPublication—)

```ts
export interface CloudSaveResult {
  ok: boolean; // QUÉ ES: true si al menos 1 media se subió y el paquete JSON se guardó.
  savedMedia: string[]; // QUÉ ES: paths canónicos en el cloud de los media subidos (p.ej. media/videos/final.mp4).
  savedPackage: string | null; // QUÉ ES: path del paquete JSON (exports/publications/<id>.json) o null si falló.
  errors: string[]; // QUÉ ES: mensajes de error acumulados (fail-soft, no lanzan).
}

/** Sube los media de un paquete + el paquete JSON al cloud. Fail-soft: nunca lanza. */
export async function guardarPaqueteEnCloud(
  cloud: CloudService, // QUÉ ES: instancia ya resuelta (Local o R2). PARA QUÉ: el dominio no construye adapters.
  paquete: PublicationPackage, // QUÉ ES: el paquete completo (media + captions + visuales).
  id: string, // QUÉ ES: id de la Publication ya creada. PARA QUÉ: nombre del JSON auditable y trazable.
): Promise<CloudSaveResult> {
  const savedMedia: string[] = [];
  const errors: string[] = [];
  // QUÉ ES: subir cada URL de media al cloud, en paralelo (Promise.allSettled para fail-soft).
  // PARA QUÉ: una URL caída no tumba el resto del lote.
  // POR QUÉ: allSettled (no all) — queremos tolerar fallos parciales y reportarlos.
  await Promise.allSettled(
    (paquete.media ?? []).map(async (url) => {
      try {
        const res = await fetch(url); // QUÉ ES: descargar la URL pública del media (pollinations/local/meigen…).
        // PARA QUÉ: el cloud guarda BYTES, no URLs — CloudService.upload exige Uint8Array.
        if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        // QUÉ ES: nombre del archivo derivado de la URL (último segmento, sin query).
        // PARA QUÉ: nombres estables y legibles en el cloud.
        const name = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'media.bin');
        // QUÉ ES: subir a la carpeta que clasifica su tipo (video→media/videos, imagen→media/images…).
        // POR QUÉ: CloudService.upload sin targetPath usa 'drafts' por defecto; nosotros queremos el layout canónico.
        const saved = await cloud.upload(name, bytes);
        savedMedia.push(saved.path); // QUÉ ES: path canónico devuelto por el adapter.
      } catch (err) {
        errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),
  );
  // QUÉ ES: guardar el paquete JSON como traza auditable en exports/publications/.
  // PARA QUÉ: reproducir la decisión de publicación sin depender de Prisma (backup offline).
  // POR QUÉ: la carpeta exports existe en CLOUD_LAYOUT y es el lugar natural para entregables.
  let savedPackage: string | null = null;
  try {
    const jsonBytes = new TextEncoder().encode(JSON.stringify(paquete, null, 2));
    // QUÉ ES: upload con targetPath explícito (la ruta completa la arma CloudService + sanitize).
    const saved = await cloud.upload(`${id}.json`, jsonBytes, 'exports/publications');
    savedPackage = saved.path;
  } catch (err) {
    errors.push(`paquete JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  // QUÉ ES: ok = al menos un media subido O el JSON guardado (o ambos).
  return { ok: savedMedia.length > 0 || savedPackage !== null, savedMedia, savedPackage, errors };
}
```

### 3.3 Firmas ampliadas (reemplazar las interfaces existentes líneas 31-42)

```ts
export interface CreatePublicationInput {
  paquete: PublicationPackage;
  canal: PresentChannel;
  scheduledAt?: Date | null;
  creadoPorId?: string | null;
  cloud?: CloudService; // QUÉ ES: opcional — si se inyecta, el paquete se respalda en la nube.
  // PARA QUÉ: el caller decide (rutas API/agentes con cloud; tests sin cloud).
  // POR QUÉ: aditivo — no rompe llamadas existentes (los 15 tests actuales siguen pasando sin cambio).
}

export interface CreatePublicationResult {
  id: string;
  estado: PublicationEstado;
  requiereAprobacion: boolean;
  cloudGuardado?: CloudSaveResult | null; // QUÉ ES: resultado del respaldo (null si no se pidió).
  // PARA QUÉ: el caller puede avisar al usuario si algún media no se pudo respaldar.
}
```

### 3.4 Cuerpo de `createPublication` (línea 45: `export async function createPublication...` → línea 66)

```ts
export async function createPublication(db: Db, input: CreatePublicationInput): Promise<CreatePublicationResult> {
  const requiereAprobacion = canalRequiereAprobacion(input.canal);
  const caption = input.paquete.captionsByChannel[input.canal]?.caption ?? input.paquete.contenido.slice(0, 300);
  const hashtags = input.paquete.captionsByChannel[input.canal]?.hashtags ?? [];
  const mediaScore = puntuarPaquete(input.paquete).score;
  const created = await db.publication.create({
    data: {
      briefId: input.paquete.briefId ?? null,
      tema: input.paquete.tema,
      canal: input.canal,
      paqueteJson: JSON.stringify(input.paquete),
      caption,
      hashtags: JSON.stringify(hashtags),
      estado: requiereAprobacion ? 'DRAFT' : 'APPROVED',
      requiereAprobacion,
      scheduledAt: input.scheduledAt ?? null,
      creadoPorId: input.creadoPorId ?? null,
      mediaScore,
    },
  });
  // QUÉ ES: respaldo en cloud SOLO si el caller lo pidió (opcional).
  // PARA QUÉ: la cola funciona sin cloud (tests, instalaciones sin cloud); con cloud, respaldo automático.
  // POR QUÉ: fail-soft — si el cloud falla, la publicación YA está creada y no se revierte.
  const cloudGuardado = input.cloud
    ? await guardarPaqueteEnCloud(input.cloud, input.paquete, created.id)
    : null;
  return { id: created.id, estado: created.estado as PublicationEstado, requiereAprobacion, cloudGuardado };
}
```

### 3.5 Wiring del caller (referencia — al aplicar, revisar dónde se llama `createPublication`)

```ts
// En apps/web/src/app/api/publications/route.ts (o donde se llame createPublication):
import { resolveCloudAdapter } from '../../packages/core/...'; // no — el adapter se resuelve en runtime:
// QUÉ ES: crear el CloudService con el adapter resuelto por env (mismo criterio que resolveCloudAdapter de llm.ts).
// PARA QUÉ: la ruta API respalda en nube local o R2 según configuración.
// POR QUÉ: el dominio nunca resuelve adapters; el caller sí.
// const cloud = new CloudService({ adapter: workerUrl && token ? new R2CloudAdapter({...}) : new LocalCloudAdapter(ULTRAIA_CLOUD_DIR) });
// const result = await createPublication(db, { paquete, canal, scheduledAt, creadoPorId, cloud });
// if (result.cloudGuardado?.errors.length) { /* log de errores, no bloquear */ }
```

> NOTA: al aplicar, confirmar que `resolveCloudAdapter` esté exportado desde `ai/llm.ts`
> (hoy es `function` privada, línea 169) o replicar su lógica en la ruta API.

## 4) Verificación obligatoria al aplicar (orden CI, árbol limpio)

```powershell
npm run typecheck   # 1
npm run lint        # 2
npm run test        # 3 — deben pasar los 15 tests de publications + 27 de cloud
npm run build       # 4 (matar antes dev servers: taskkill /T /F)
```

Tests nuevos sugeridos (en `packages/core/src/domain/publications.test.ts`):
1. `createPublication con cloud inyectado sube media al InMemoryCloudAdapter` — assert
   `savedMedia` contiene `media/videos/<nombre>` y `savedPackage` = `exports/publications/<id>.json`.
2. `createPublication con URL caída es fail-soft` — mock fetch → 500; publicación creada igual,
   `errors` contiene la URL, `ok` depende del JSON.
3. `createPublication sin cloud no respalda` — `cloudGuardado === null` (regresión: los 15 actuales).

Staging explícito del commit (NUNCA `git add .`):
```powershell
git add packages/core/src/domain/publications.ts packages/core/src/domain/publications.test.ts
git commit -m "feat(autopub): respaldo de paquetes en UltraIA Cloud al crear publicacion (fail-soft, cloud inyectable)"
```

## 5) Por qué NO se aplicó ya

1. `publications.ts` vive en `packages/core/src/domain/` — la sesión #25 está editando
   `shared/domain.ts`, `blueprint.ts`, `reach.ts` del mismo paquete (riesgo real de conflicto).
2. Los gates FULL no corren verdes hoy (archivos untracked de #25 rompen typecheck).
3. Regla del usuario (17/08/2026): cualquier adición a archivos existentes → tarea .md con
   código comentado (qué/para qué/por qué) para aplicar tras verificar.

**Señal para aplicar**: `git status --porcelain` sin archivos de #25 (ni `automation*`, `recorder*`,
`blueprint*`, `reach*`, `web-automation.py`, `shared/domain.ts`) + gates FULL verdes.
