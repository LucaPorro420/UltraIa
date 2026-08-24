# Plan loop-98 — codevfx v2: vendor + análisis profundo + mejoras (LinearAbiltyCastingThreeJS)

## Contexto
El repo `achrefelouafi/LinearAbiltyCastingThreeJS` (MIT) ya fue la fuente INDIRECTA de la
capability `codevfx` (loop-45, 17/08/2026, commits f106546+b4d7695) vía post de Instagram.
NUNCA se vendió el repo ni se analizó el código fuente real. El README del upstream documenta
principios de arquitectura muy superiores a lo capturado en el port v1 (29 tests):
settings-as-API, no-dimensions-on-CPU (records fraccionales), ribbon paramétrico (t,side),
beam triple-capa (halo/sheath/core rim vs axis-weighted), dos relojes flicker (restrike+crawl),
perfiles de ruido (piecewise-linear rayo vs smooth beam), indicadores SDF en metros,
partículas GPU ring-buffer con gradiente lifetime, phase machine con beat wind-up,
anti-patrón atan-decals, pipeline render (depth prepass/bloom/ACES/grade), pooling budgets.

## Objetivo
Vendor completo del repo + análisis profundo del fuente + port ORIGINAL aditivo de los
principios avanzados a `codevfx.ts` (+wiring tool `vfx_code`, +tests, +docs).

## Decisiones usuario (24/08/2026)
1. Vendor COMPLETO (incluye FBX/HDR — VENDOR-NOTE registra sus licencias originales).
2. Alcance COMPLETO A-F (vendor+análisis+código+wiring+tests+docs).

## SPEC / DESIGN
- Dominio puro determinista keyless (patrón codevfx/growth/vfx): funciones puras, sin reloj
  real (seed/t inyectables), sin fetch, sin ejecución de three.js.
- Nombres nuevos SIN colisión con exports existentes (verificado contra codevfx.ts actual:
  EFFECT_KINDS..renderEffectHtml; grep repo para cada nombre nuevo).
- Retrocompatible: planEffect/renderEffectHtml/firmas intactas; OMAG vfx-generator intacto.

## LEARN
- LEARNINGS vigentes aplicables: commit pathspec SIEMPRE; no tocar WIP ajeno; cuarentena
  hash-check para gates FULL; JSDoc `/**` sin `//` internos; PS5.1 rompe UTF-8 (usar tools).
- Lección nueva esperada: porting de principios de arquitectura v2 desde README+fuente real.

## TEST
- Scoped: vitest packages/core/src/tools/codevfx.test.ts (~29 existentes + ~25 nuevos).
- tsc core --noEmit EXIT 0.
- FULL: typecheck -> lint -> test -> build (cuarentena WIP ajeno si rompe: evo.ts,
  physics2d.ts, pngrender.wiring.test.ts modificados por sesión concurrente).

## Pasos
1. Lock: tomar control del lock stale de loop-95 (adquirido 03:40-05:00, ~7h; archivos disjuntos).
2. Plan file (este archivo) + [P] en loop-run-log.md.
3. Vendor: git clone --depth 1 https://github.com/achrefelouafi/LinearAbiltyCastingThreeJS
   vendor/LinearAbiltyCastingThreeJS; quitar .git; VENDOR-NOTE.md (MIT + licencias FBX/HDR +
   commit hash upstream); verificar tamano.
4. Analisis: leer src/config/settings.js, abilities/*, materials/*, shaders/lib/*, particles/,
   effects/, postprocessing/ vendidos -> docs/RAZONAMIENTO-CODEVFX.md v2.
5. Implementacion aditiva codevfx.ts:
   - effectSettingsTree(kind): arbol tipado de params por kind (settings-as-API) con
     defaults/rangos/grupos; determinista.
   - deepMergePreset(base, patch): merge profundo INMUTABLE (no muta base; arrays reemplazan).
   - fractionalSpawn(kind, opts {seed, distance01, lateral01}): record SOLO con fracciones
     unitless + seed + timestamps; resolveSpawnDimensions(record, settings): resuelve metros/
     radianes/segundos contra settingsTree EN EL MOMENTO (principio central edit-en-pausa).
   - phaseMachine(kind, opts): fases windup?->travel->impact->fade con duraciones derivadas
     del settings tree; transition(phase,t) determinista.
   - flickerClocks(t, {restrikeHz, crawlSpeed}): dos relojes (snap N/s + deslizamiento continuo).
   - noiseProfileFor(kind): 'piecewise-linear' (lightning/meteor-wake) vs 'smooth-flow' (beam)
     + rationale string ("a beam that kinks is a bolt").
   - aimIndicatorPlan({rangeM, minRangeM, shaftWidthM...}): flecha SDF en metros (union
     redondeada box+triangulo iq), chevrones, ring de alcance.
   - zoneIndicatorPlan({zoneRadiusM, boundaryM, snapTime}): borde de grosor metrico constante,
     boundaryBias, snap = outCubic x bump pico tardio muere en 1.
   - particleSystemSpec(kind): sistemas con ring buffer capacity, siluetas procedimentales
     (soft/smoke/streak/chip/ring), gradiente lifetime birth->early->late->death, blending.
   - renderPipelinePlan(): stack depth-prepass -> distortion hook -> bloom -> ACES -> grade
     (chromatic aberration/lift-gain-contrast-sat-temp/vignette/grain/flash) como datos.
   - validateDecalSampling(desc): RECHAZA muestreo polar atan(y,x) (dibuja rayos rectos),
     exige plano + domain warp (leccion documentada del upstream).
   - geometryShapeHash(params): hash estable para sync de geometria por params de forma.
   - drawCallBudget(kind, opts): presupuesto estimado por familia (bolt=2, snare=3, beam=6...)
     con guardas de pool.
6. Wiring llm.ts: acciones nuevas en tool vfx_code (retrocompatible):
   settings/preset/spawn/phases/flicker/noise/aim/zone/particles/pipeline/decal_check/budget.
7. Tests: ~25 nuevos cubriendo cada planner (determinismo byte-exact, invariantes, retrocomp).
8. Docs: RAZONAMIENTO-CODEVFX.md v2 + leccion LEARNINGS.md + STATE.md fila 98 DONE +
   [I][V][R] run-log.
9. Gates FULL + commit pathspec.

## ARCHIVOS A TOCAR (lista cerrada)
- vendor/LinearAbiltyCastingThreeJS/** (NUEVO, clon)
- docs/RAZONAMIENTO-CODEVFX.md (reescribir v2)
- packages/core/src/tools/codevfx.ts (aditivo)
- packages/core/src/tools/codevfx.test.ts (aditivo)
- packages/core/src/ai/llm.ts (acciones vfx_code)
- learning/LEARNINGS.md (append leccion)
- STATE.md (fila 98)
- loop-run-log.md ([P]/[I]/[V]/[R])
- .opencode/plans/.loop-lock.json (mi lock)

## NO-hacer
- NO copiar codigo del upstream (port ORIGINAL de principios, attribution header).
- NO tocar omag/vfx-generator.ts ni las firmas existentes de codevfx.
- NO tocar WIP ajeno: evo.ts, physics2d.ts, pngrender.wiring.test.ts, geometry.wiring.test.ts,
  procvid.wiring.test.ts, recordly.*, plans loop-92/94/95/96, SACD-P*, RoadMapLearning, pdf/.
- NO push (gate humano).
- NO commitear vendor package-lock.json si >2MB? -> se evalua; regla default: repo completo
  decidido por usuario, se respeta salvo riesgo de peso extremo (>25MB binarios) que se
  reportaria antes de commitear.

## RECURSOS / PRESUPUESTO
- Tiempo objetivo: <= 90 min. Tokens: ciclo normal PIVR.
- Red necesaria: github.com (clon) — verificada OK 20/08.

## Criterios de verificacion
- SCOPED: vitest codevfx >= 54 PASS; tsc core EXIT 0; nombres nuevos sin colision (grep).
- FULL: typecheck 0 / lint 0 / test EXIT 0 (con cuarentena ajeno si aplica) / build 0.
- Commit pathspec unico feat(core) + vendor; evidencia [V] con numeros reales.

## TOLERANCIAS
- Tests flakes de red: reintentar x2 antes de diagnosticar (Tunetank/yt-dlp no aplican aqui).
- Si el build falla por .next corrupto: matar node dev servers + Remove-Item .next + reintentar x2.
- Si gates FULL bloqueados por WIP ajeno IRREPARABLE: commit scoped propio + reporte en run-log
  (precedente iter-95 GIF: FULL parcial documentado).

## Riesgos
- R1 Tamano del vendor con binarios FBX/HDR: mitigado por chequeo pre-commit (regla en NO-hacer).
- R2 Concurrencia loop-95: lock stale tomado con nota; archivos disjuntos verificados.
- R3 Colision de nombres export: mitigado por grep previo + tsc.
- R4 Red caida durante clon: reintentar x2; fallback zip codeload.

## Esfuerzo / Prioridad
- Esfuerzo: M (medio). Prioridad: P2 (mejora de capability existente, pedido directo usuario).
