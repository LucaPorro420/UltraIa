# RAZONAMIENTO-WEB3D-MOTION (iter-178, 06/09/2026)

Fuentes: `learning/sources/web3d-motion.md` (peachweb.io, threlte.xyz, theatrejs.com,
spline.design + licencias/stars verificados por websearch el 06/09/2026).

## Mapeo contra UltraIa (qué ya existe)

| Principio externo | Estado en casa | Gap real |
|---|---|---|
| Escenas Three.js declarativas (Threlte `<T>`) | `aurora-canvas.tsx`, playground, chaos-game usan three imperativo + R3F parcial | Solo ergonomía; el render ya funciona y el chunk three va separado en next.config |
| Sequence editor visual (Theatre studio) | `codevfx`/`procvid`/`video-edit` generan argv y keyframes deterministas, sin GUI | **SÍ hay gap**: planificar keyframes en JSON + previsualizar sin editor visual |
| Física (Rapier vía Threlte) | `physics2d.ts` propio 2D; nada 3D/WASM | Gap opcional para playground/chaos |
| Escenas hospedadas + viewer embed (Spline) | `website-clone` extrae HTML y genera componentes; sin visor de escenas | Gap solo si se quiere embed de terceros |
| Builder no-code 3 pasos + galería (PeachWeb) | `/builder` funcional (DnD, codegen, export) + `/gallery`; sin onboarding guiado | Gap UX comercial, no técnico |

## Decisiones (con motivo)

1. **Theatre.js → capability `theatre-sequence` (backlog 179/180)**: portar PRINCIPIOS, no el
   paquete entero al inicio — `Project/Sheet/Sequence/Track/Keyframe/Easing` como JSON
   determinista testeable (mismo patrón que `video_edit` EDL y `codevfx` plans) + adapter fino
   sobre `@theatre/core` (Apache-2.0) para reproducir en el browser. El `@theatre/studio`
   (AGPL-3.0) queda como devDependency con import dinámico SOLO en dev: el bundle prod nunca
   lo incluye (así solo aplica Apache-2.0). Fijar versión exacta (docs vistas: 0.5; ritmo lento
   desde 2024).
2. **Threlte → NO adoptar el framework** (la web es React/Next, reescribir a Svelte queda
   descartado P5). Sí: (a) Rapier (`@dimforge/rapier3d-compat`) para física 3D en
   playground/chaos-game; (b) patrón CLI `gltf → componentes declarativos` para que
   `website-clone` emita componentes reutilizables en vez de HTML plano.
3. **Spline → sin dependencia runtime** (rompe keyless-first: cuenta + CDN `prod.spline.design`
   + versiones breaking como 1.9.82). Uso legítimo: fuente de assets (export glTF) y guía de
   embed opcional en docs para el usuario comercial. Referencia de puente: `threlte-spline`
   (MIT) — documenta alinear versión exacta de `three` con `@splinetool/loader`.
4. **PeachWeb → patrones UX, cero código** (SaaS cerrado): onboarding en 3 pasos
   (cuéntanos → tema → edita y publica), galería de templates/showcases y storytelling con
   scroll-3D para el `/builder` y la landing comercial. Nutre backlog 182.
5. **No-licencias**: nada copiado de PeachWeb/Spline (cerrados); Threlte MIT y Theatre core
   Apache-2.0 permiten uso comercial con attribution; studio AGPL solo dev-time.

## Criterios de aceptación del futuro capability

- `theatreSequencePlan` determinista (misma entrada → mismo JSON), validado con zod, sin red.
- Reproduce en `@theatre/core` sin el studio; test que falla si el studio entra al bundle
  (assert sobre imports o chunk).
- keyframes reutilizan el vocabulario MOTIONS de `prompt/director.ts` donde aplique.
