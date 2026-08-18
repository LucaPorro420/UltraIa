# Elemental Sandbox VFX — fuente cruda (17/08/2026)

- URL de origen: https://www.instagram.com/p/DcJDsghiJne/ (post de @menteprompt, 17/08/2026;
  republicación del hilo de Chiro Visuals en X, 10/08/2026, 140K views)
- Repo del proyecto: https://github.com/achrefelouafi/LinearAbiltyCastingThreeJS (MIT)
- Demo alojada: https://genex.games/world/elemental-sandbox (Genex, basado en Three.js)
- Recuperación: r.jina.ai (directo a Instagram = anti-bot 400)

## Descripción del post (texto original)

"Un desarrollador ha creado un sandbox VFX open source usando Three.js donde absolutamente
todo se genera en tiempo real. 6 habilidades totalmente personalizables, partículas simuladas
en la GPU y shaders GLSL escritos a mano. Sin texturas, sin sprite sheets y sin meshes
pre-renderizados. Todo el efecto visual nace directamente del código. Comenta 'ELEMENTAL' y
te mando el repo."

## Descripción del repo (Genex + X thread de chirovisuals)

- "A skillshot VFX sandbox, not a game: six abilities, two aiming shapes, and a live editor
  whose sliders keep applying while the simulation is paused."
- Controles: Q/E/R/F/V/X arman un lanzamiento; apuntar con mouse; clic dispara. Q/E/R/F son
  line casts (flecha estilo League); V/X son far casts (círculo). G abre el editor VFX, P
  pausa (el editor sigue aplicando — congelar un frame a mitad de erupción y remodelarlo),
  C limpia, H oculta la ayuda. Right-drag orbita la cámara, scroll zoom.
- "Everything on screen is generated - no sprite sheets and no VFX textures anywhere.
  The ice crystals are procedural geometry, the lightning bolt is a ribbon strip placed
  entirely by a vertex shader, the meteor is an icosphere cratered and sliced by fracture
  planes, the beam is a parametric tube drawn three times at three radii, and the aim
  arrow, targeting circle, rime, ground burns and molten cracks are signed-distance and
  noise shaders. The only meshes on disk are the character rig and its Mixamo cast
  animations."
- Construido con Three.js, Vite y GLSL escrito a mano. MIT.
- Expandido por fabiancabau/threejs-vfx: "A skillshot VFX sandbox with 100 procedural spell
  effects across 15 schools. Three.js and hand-written GLSL, nothing is a texture."
- También: mengen-li-2/ThreeJSVFX-Demo "Elemental Sandbox" (10 abilities).

## Principios técnicos transferibles (para port ORIGINAL)

1. **Cero assets**: todo efecto nace del código — sin texturas, sin sprites, sin mallas
   horneadas. Proceduralismo puro.
2. **SDF (Signed Distance Fields) + noise shaders** para formas (flecha de aim, círculo de
   targeting, escarcha, quemaduras en suelo, grietas de magma).
3. **Geometría procedural**: cristales de hielo = geometría generada; meteorito = icosphere
   craterizada/cortada por planos de fractura; beam = tubo paramétrico a 3 radios.
4. **Vertex shader como "lugar" de la forma**: el rayo es una cinta (ribbon strip) colocada
   enteramente por vertex shader (world position resuelto ahí).
5. **Partículas instanciadas simuladas en GPU**.
6. **Editor en vivo**: los sliders siguen aplicando con la simulación pausada (P) —
   iteración visual en tiempo real sobre parámetros.
7. **Habilidades = 6 familias de efectos** (las del sandbox): fire, ice, lightning, meteor,
   beam, ground/aim effects; el fork de fabiancabau las expande a 100 efectos / 15 escuelas.

## Petición del usuario (17/08/2026)

- "Replica esos efectos 100% con programación visual y crea otros ejemplos de ellos solo con
  código sin necesidad de utilizar videos o objetos 3D."
- "Utilizarás la información sobre colorimetría e escaneos de objetos 3D para analizar sus
  cambios de colores en los lugares específicos donde se distingue el cambio de color,
  perspectiva y curvaturas de los objetos para mejorar sus diseños e 'replicar' realismo."

## Decisión de implementación

Port ORIGINAL de los PRINCIPIOS (sin copiar código — attribution header) en
`packages/core/src/tools/codevfx.ts` (dominio puro determinista, zod, sin deps):
- `planEffect(kind, opts)` → spec de efecto 100% código: paleta de colorimetría, gradiente
  de luz/curvatura, partículas, forma SDF, argvs de render Canvas 2D (NO Three.js — sin 3D,
  sin assets; corre en cualquier navegador/móvil con canvas).
- Kinds: `fire` / `ice` / `lightning` / `meteor` / `beam` / `ground` (las 6 del sandbox)
  + extra `void` / `plasma` / `frost` (ejemplos nuevos).
- `colorimetryAnalyze` — analiza un set de colores (hex) → temperatura (frío/caliente),
  contraste, canal dominante, curvas de gradiente para simular realismo (highlight/shadow
  placement sobre curvatura).
- `curvatureShade` — sombreado de curvatura 2D: highlight especular + falloff radial
  (simula la curvatura de un objeto sin 3D — la técnica de esferas 2D).
- `perspectivePlan` — planos de gradiente con punto de fuga para perspectiva simulada.
- Tool de agente `vfx_code` (capability `codevfx`): acciones effect/colorimetry/curvature/
  perspective. Generador de demos HTML autocontenidos (canvas + JS inline, sin deps,
  offline) → `resultTask/codevfx/`.

Tests deterministas en codevfx.test.ts (dominio puro, sin canvas real — solo specs y
números verificables).