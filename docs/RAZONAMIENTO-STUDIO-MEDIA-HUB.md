# RAZONAMIENTO — Studio v2: Media Hub + Open Source Lab (loop-104)

**Petición usuario (24/08/2026)**: "mejoras para cada modelo de studio... guardar las imagenes videos,
musica, disenos, verlos reproducirlos descargarlos modificarlos etc. y anade un apartado para ampliar
y mejorar por otras implementaciones de otros proyectos que tenemos en codigo abierto".
**Aprobación**: 3 fases completas · binario en cloud local por defecto · registro PIVR.
**Commits**: `d878cd6` (core) · `96deedb` (web).

## 1. Diagnóstico (por qué el Studio no guardaba nada)

El Studio (`apps/web/src/app/(app)/studio/studio-client.tsx`, 669 líneas pre-loop-104) mantenía cada
resultado SOLO en estado React:

| Panel | Antes | Raíz del gap |
|---|---|---|
| Image | `<img>` efímero | `/api/library/assets` existía pero el Studio no lo llamaba |
| Video | grid de frames | sin player ni persistencia; frames regenerables pero no guardados |
| Music | plan textual | `composeMusic` devuelve estructura; NINGÚN audio real |
| Design | imageUrl/htmlUrl externos | sin guardar; HTML inaccesible desde la app |
| Branding/Web/Chat | ídem / lectura | sin integración con el hub |

La infraestructura necesaria YA existía y estaba probada: Prisma `GeneratedAsset` (con campo
`mediaType` multi-media desde su creación), `CloudService` local/R2, `omag/sound.ts` (WAV puro TS),
Tunetank `searchMusic`. El gap era de **cableado y reglas**, no de capacidad → dominio puro nuevo
(`studio.ts`) + rutas API + UI, cero dependencias nuevas.

## 2. Decisiones de diseño

1. **Binario durable por defecto** (decisión usuario): al Guardar, el servidor baja la URL externa y
   sube el binario a CloudService (`media/images|videos|audio|design`, cap 100 MiB heredada de
   cloud.ts). Las URLs de pollinations expiran; el blob no. Fail-soft: si la descarga falla, se
   guarda como `external` con la URL viva como fallback.
2. **Derivación = assets hijos con `parentId`**: modificar nunca destruye el original. Re-roll
   img2img, resíntesis musical y slideshow MP4 crean un asset nuevo encadenado (cadena de versiones
   consultable vía relación Prisma).
3. **Música reproducible keyless**: `renderCompositionWav` compone beat propio (BPM variable,
   kick+hat deterministas por seed) + pad de ambience + motivo pentatónico sobre `omag/sound`.
   Misma entrada+seed → WAV byte-exacto (test de igualdad incluido). Tope 30 s por memoria/tamaño.
4. **Vídeo dos velocidades**: player slideshow CSS (crossfade+Ken Burns, `prefers-reduced-motion`
   respetado) SIEMPRE disponible; "Render MP4" ejecuta argv ffmpeg determinista en el servidor con
   fail-soft explícito (503 + hint + argv) cuando no hay ffmpeg (deploy cloud).
5. **Imagen modificable sin decodificador PNG/JPEG en servidor**: filtros CSS persistentes en
   `metaJson.filters` (preview instantáneo + export cliente vía canvas/download del binario original)
   + re-roll generativo para cambios semánticos. Evitó añadir decode nativo o WASM al bundle.
6. **Catálogo OSS como datos puros separados** (`studio-catalog.ts`, cero imports): el server
   component lo pasa como prop → el cliente nunca arrastra Buffer/zod de core al bundle.
7. **Tool `studio_asset`** (capability `studio`): acciones puras save_plan/derive_plan/synth_plan/
   catalog para que los agentes bp-* operen el hub programáticamente; la EJECUCIÓN queda en la API.

## 3. Mapeo petición → entregado

| Pedido | Implementado |
|---|---|
| Guardar imágenes/vídeos/música/diseños | `AssetActions` en TODOS los paneles + POST assets con `saveBinary` |
| Reproducirlos | `<audio>` WAV real (música), StoryboardPlayer (vídeo), lightbox Abrir (imagen/diseño) |
| Descargarlos | `GET /api/assets/[id]/download` con Content-Disposition slugificado |
| Modificarlos | filtros CSS+persistencia y Variación IA (imagen), BPM/mood/segundos→resíntesis (música), Render MP4 (vídeo), PATCH prompt/meta, DELETE |
| Apartado open source | tab "Open Source Lab": 8 vendor cards con estado ported/wired/available + acción que habilita cada uno |

## 4. Concurrencia (incidente y contramedidas)

Durante el ciclo, una sesión IDE concurrente revirtió `schema.prisma` e `index.ts` y borró 3 veces
los `studio*.ts` untracked (firma idéntica al incidente iter-93). Contramedidas aplicadas:
backup %TEMP% temprano, **staging inmediato** tras cada write (el blob queda en el object DB) y
**commit temprano con pathspec** (precedente iter-93) antes de continuar. Sus archivos
(procvid.ts/layout/globals/nav/workspace/components-ide) NO fueron tocados; los gates FULL se
corren con cuarentena del WIP ajeno (protocolo iter-54).

## 5. Pendientes conscientes (Watch List)

- Integraciones OSS `available`: webharvest (provider WebPanel), mcp-search/firecrawl (research),
  openbrowser (screenshot assets), ecc (skills bp-*) — acciones ya definidas en el catálogo.
- Export cliente "descargar CON filtros" vía canvas (hoy el download entrega el binario original;
  los filtros viven en metaJson).
- Cadena de derivados visible en Creaciones (parentId ya persistido; UI de árbol pendiente).
- App móvil: replicar tipos de assets API cuando se consuma el hub.
