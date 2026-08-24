# RAZONAMIENTO-CODEVFX — Elemental Sandbox VFX (v2, fuente vendida)

**Fuente**: repo vendido `vendor/LinearAbiltyCastingThreeJS` (commit upstream `ba61847cb688`,
MIT para el codigo; FBX/HDR conservan licencias originales - ver VENDOR-NOTE).
**Historia**: loop-45 (17/08/2026) porto los principios de SUPERFICIE desde la referencia
del post de Instagram (v1: planEffect/colorimetría/curvatura/perspectiva/render, 29 tests).
**Este documento v2** (24/08/2026, loop-98) reemplaza al analisis v1: es la extraccion de
principios de ARQUITECTURA leida directamente del codigo fuente real, y el mapeo de lo que
se porto aditivamente a `codevfx.ts` como `codevfxV2` (+30 tests, total 59).

## Los principios de arquitectura del fuente real

1. **Settings are the API** (`src/config/settings.js`, ~89 KB / ~938 sliders): UN arbol
   declarativo posee todo el estado tunable. Shaders, particulas, luces y post LEEN esos
   objetos cada frame. Un preset se fusiona con deep-merge DENTRO de los mismos objetos ->
   editar en vivo sin rebuild, incluso con la simulacion en pausa.
2. **No dimensions on the CPU** (`Ability.js`/`ThunderAbility.js`): un record de spawn solo
   captura FRACCIONES sin unidad (posicion a lo largo de la linea, lateral firmado, jitters)
   + una seed + timestamps-evento. Ningun metro/radian/segundo se congela. Todo se resuelve
   CONTRA settings dentro del update loop -> mover `height` re-crece un campo YA parado.
3. **Ribbon parametrico `(t, side)`** (`LightningMaterial.js`, coils del beam, jaula del
   snare): una sola tira instanciada donde cada vertice lleva SOLO coordenadas de parametro;
   el vertex shader la convierte en posicion mundo CADA frame. La forma jamas toca la CPU:
   `strands`/`tendrils` son casi gratis y el budget de draws no crece con el detalle.
4. **Triple capa del beam = integral de volumen barata** (`BeamMaterial.js`): HALO (solo rim),
   SHEATH (rim-weighted, hueca) y CORE (axis-weighted INVERTIDO: mas brillante donde el rayo
   de vista recorre el barril). Rim fuera + eje dentro + ambas caras sumando = columna solida.
5. **Dos relojes de flicker**: restrike SNATEA cada filamento a forma nueva N veces/s
   (`strike=floor(t*max(restrikeHz,0.01))`, default 24) y crawl desliza los quiebres en medio
   (`t*crawl`, default 3.2). Sin ellos un bolt sostenido es una cinta estatica.
6. **El perfil de ruido ES la personalidad**: rayo con rampa LINEAL (smoothstep redondearia
   las esquinas; las esquinas SON el rayo); beam suave estirado contra el flujo ("a beam that
   kinks is a bolt"); hielo con fbm dual: fracturas en espacio MUNDO (tamano fisico constante
   entre cristales) y escarcha en espacio LOCAL (sigue el eje de cada cristal).
7. **Indicadores SDF medidos en METROS**: la flecha es UN quad cuya SDF se remapea a metros
   desde el caster (union redondeada box+triangulo exacto de iq); de ESA sola field derivan
   contorno, lavado interior rim-weighted, chevrones (fase sesgada por |x|), escarcha voronoi,
   ring del caster y arco de alcance. El circulo de zona mantiene su borde de GROSOR METRICO
   constante (0.34 m) con radius 2 u 8 m.
8. **Snap overshoot**: `snapped = radius * outCubic(t) * (1 + (snap-1) * bump)` con
   `bump = sin(pi * t^1.7)` (pico tardio que muere EXACTAMENTE en 1, snap default 1.18).
   Un circulo que crece lineal lee como UI; uno que se pasa y vuelve lee como accion.
9. **GPU particles ring buffer** (`ParticleSystem.js`): la CPU solo escribe spawns de slots
   cambiados; emitir de mas RECICLA (nunca aloja). Siluetas 100% procedurales
   (soft/smoke/streak/chip/ring), gradiente lifetime birth->early->late->death por sistema,
   drag analitico + turbulencia curl en shader. Nota anti-fireworks: los sparks del bolt salen
   de VARIOS puntos a lo largo del rayo, no de un origen unico.
10. **Phase machine con beat extra**: IDLE->TRAVEL->IMPACT->FADE->DONE; frente con ease-in
    outQuad en ventana de 0.08s keyed a EDAD (keyed a u multiplicaria el primer paso por 0).
    El beam agrega WIND-UP sin tocar la maquina: advance() se niega a soltar el frente hasta
    cargar -> IMPACT se convierte en la quemadura.
11. **Anti-patron documentado** (`GroundDecals.js` FROST): manejar la silueta de un decal con
    atan(y,x) entrega a cada radio del mismo bearing el mismo valor de lobe - "literalmente
    como se dibuja una estrella". Correcto: muestrear EN EL PLANO (q = c*max(0.35,radius)) y
    deformar el lookup con fbm (warp ~0.45) para que las vetas serpenteen y bifurquen.
12. **Sync de geometria por hash** (`IceAbility._syncGeometry`): solo los params de FORMA que
    no caben en una transform por instancia (facets/taper/roughness/bend) se hornean; la clave
    `${round(facets)}|${taper.toFixed(3)}|...` decide rebuild. Mover cualquier otro slider es
    gratis. Presupuestos verificados: MAX_SPIKES 288, filamentos 24x72 muestras, jaula 56
    roles, MAX_CONCURRENT 4 casts, pool de 6 luces con acquire() -> null guardado.
13. **Pipeline**: depth prepass half-res (intersecciones suaves contra el suelo) -> gancho de
    distorsion -> bloom -> ACES -> grade UNICO que pliega aberracion/lift/gain/contraste/
    saturacion/temperatura/vineta/grano/flash. Pixel ratio cap 1.75; compileAsync en boot.

## Mapeo implementado en `codevfxV2` (port ORIGINAL, nada copiado)

| Principio | Export nuevo |
|---|---|
| Settings-as-API | `effectSettingsTree(kind)` (global/cast/effect en unidades fisicas) + `castShapeFor` + `ZONE_KINDS` |
| Presets deep-merge | `deepMergePreset` (inmutable, objetos mezclan / arrays reemplazan) |
| No-dimensions-on-CPU | `fractionalSpawn` (record fraccional+seed+timestamp) + `resolveSpawnDimensions(record, tree?, ageSec?)` + `lightShimmer` |
| Phase machine + wind-up | `phaseMachine` + `evaluatePhase` (windup solo beam/plasma; impact 1.1s/fade 1.2s del vendor) |
| Dos relojes | `flickerClocks(t, {restrikeHz=24, crawlSpeed=3.2})` |
| Perfil de ruido | `noiseProfileFor(kind)` (piecewise-linear / smooth-flow / dual-space-fbm / domain-warped-plane + rationale) |
| Flecha SDF metrica | `aimIndicatorPlan` (constantes del vendor: shaft 0.42, head 2.6/1.35, round 0.12...) |
| Circulo de zona + snap | `zoneIndicatorPlan` + `snappedZoneRadius` (formula EXACTA outCubic x sin(pi*t^1.7)) |
| Particulas GPU | `particleSystemSpec(kind)` (ring buffer, siluetas puras, gradientes 4 paradas, notas de diseno) |
| Pipeline render | `renderPipelinePlan()` (6 pasadas + gradeTerms + notas de perf) |
| Anti-patron angular | `validateDecalSampling` (rechaza atan/polar; recomienda warp ~0.45) |
| Hash de geometria | `geometryShapeHash` + `needsGeometryRebuild` (formato de clave del vendor) |
| Budgets de draws | `drawCallBudget(kind)` + constantes `MAX_CONCURRENT_CASTS=4`, `LIGHT_POOL_SIZE=6` |

Wiring: tool `vfx_code` gana acciones `settings/preset/spawn/fases/flicker/ruido/aim/zona/
particulas/pipeline/decal_check/budget` (retrocompatible con las 5 v1).

## Verificacion

- `codevfx.test.ts`: **59/59 PASS** (29 v1 intactos + 30 v2).
- `tsc --noEmit` core EXIT 0. Gates FULL verificados en la bitacora (iter-98).
- Constantes y formulas contrastadas contra el vendor: snap 1.18, boundary 0.34 m,
  restrike 24 Hz, crawl 3.2, impact 1.1 s, fade 1.2 s, shimmer 0.9+0.1*sin(9.3a)*sin(3.7a),
  easeIn ventana 0.08 s, MAX_SPIKES 288, MAX_CONCURRENT 4.

## Pendiente (siguientes ciclos posibles)

- Render HTML v2 que CONSUMA el settings tree (sliders vivos sobre canvas 2D, pausa con P).
- Puente OMAG: VfxGeneratorAdapter usando phaseMachine + particleSystemSpec para storyboard
  de shots con efectos deterministas.
- LUT grading real (paleta -> .cube) conectando colorimetryAnalyze con vfx.planLutMatch.