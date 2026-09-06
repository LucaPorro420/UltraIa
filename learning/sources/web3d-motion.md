# Fuentes web3d-motion (06/09/2026, iter-178) — 3D web + motion design

Pedido usuario: peachweb.io, threlte.xyz, theatre.js, spline.design. Descarga: webfetch markdown
de los 4 homepages + websearch de licencias/repos el 06/09/2026. Nada inventado; lo no verificado
se marca.

## 1. PeachWeb — https://peachweb.io (SaaS cerrado, Peach Worlds Ltd © 2025)

- Qué es: builder NO-CODE de sitios WebGL/3D ("3D Websites in Minutes"), con marketplace de
  templates, tutoriales, Discord, programa de expertos y pricing con "Book a Call" (precios no
  públicos en el home).
- Casos: ecommerce (conversión), storytelling inmersivo, creative/tech, portfolio, gaming.
  Flujo: Step 1 cuéntanos de ti → Step 2 elige tema → Step 3 edita y publica. Galería de
  showcases + prueba social (4x No-Code Site of the Month, "beating Wix/Webflow/Wordpress",
  equipos de Simpsons/Futurama/Humanity Protocol — claims de marketing, no verificados).
- Código: NADA portable (producto cerrado, sin repo público). Valor = patrón UX comercial.

## 2. Threlte — https://threlte.xyz + github.com/threlte/threlte (MIT, 3.334 stars, 174 forks)

- Qué es: framework 3D declarativo sobre **Svelte + Three.js**. `<T.Mesh>` expone TODO objeto
  Three.js como componente; lifecycle de Svelte para eventos/estado; plugins type-safe
  (`injectPlugin`) que enganchan cualquier aspecto del render; eventos e interactividad nativos.
- Paquetes (6, importar solo lo necesario): `@threlte/core` (binding declarativo),
  `@threlte/extras` (GLTF, Float, OrbitControls, utilidades), `@threlte/gltf` (CLI que convierte
  GLTF en componentes), `@threlte/rapier` (física Rapier), `@threlte/theatre` (animación con
  studio), `@threlte/xr` (VR/AR), `@threlte/flex` (layout yoga).
- Endosos: Aria Minaei (creador Theatre.js, "best API and devX for Theatre.js"), Rich Harris
  (creador Svelte), comunidad Discord activa.
- Límite para UltraIa: la web es **React/Next**, no Svelte → adopción directa NO. Lo portable son
  los principios + Rapier (motor Rust/WASM usable desde cualquier stack) + el CLI gltf→componentes.

## 3. Theatre.js — https://www.theatrejs.com + github.com/theatre-js/theatre (12.653 stars, 474 forks)

- Qué es: librería JS de animación + **sequence editor profesional en el navegador**
  (dope sheet, graph editor, easing presets, outline, property editor, extensiones: cámara,
  luces, shaders, UI/tools/workflows custom). Filosofía "Code vs *plus* Art": se crea en código,
  se perfecciona en el browser. Funciona con CUALQUIER stack (solo muta variables JS): guías
  oficiales with-three-js, with-react-three-fiber y with-html-svg.
- Licencia (verificada en el repo, decisiva para comercial): `@theatre/core` = **Apache-2.0**;
  `@theatre/studio` = **AGPL-3.0**, pero el studio se usa SOLO en diseño/desarrollo y el bundle
  final incluye únicamente core → en producción aplica solo Apache-2.0. REGLA: studio como
  devDependency + import dinámico solo en dev; jamás en el bundle prod.
- Versión docs visible: 0.5. Estado 2024: último update relevante ago-2024 (119 issues abiertas) —
  maduro pero ritmo lento; fijar versión exacta al adoptar.

## 4. Spline — https://spline.design (SaaS, Spline Inc © 2026)

- Qué es: diseño 3D colaborativo en el navegador + IA agente ("Agentic 3D Design", "Hana" para
  UI/motion), con materiales por capas, estados/eventos, timeline, game controls, física y
  partículas, variables/webhooks/APIs. Export multi-plataforma: Web (Webflow/Framer/Wix/HTML/
  React/**Next.js**), iOS, Android.
- Integración web (verificada en su home): web component vía CDN + URL de escena:
  `<script type="module" src="https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js">`
  + `<spline-viewer url="https://prod.spline.design/.../scene.splinecode">`. Runtime npm:
  `@splinetool/runtime`. Comunidad + library + academy + docs + API.
- Límite para UltraIa ($0 keyless-first): requiere CUENTA + escenas hospedadas en su CDN
  (dependencia externa con breaking versions: 1.9.82 hoy) → NO como dependencia runtime.
  Sí como fuente de assets y patrón de embed. Puente comunitario: `hongkiulam/threlte-spline`
  (MIT, 14 stars, carga escenas Spline como objetos Three.js vía `@splinetool/loader` —
  ojo: exige alinear versión exacta de `three`, documentado en su README).
- Dato curioso: existe `wieslawsoltes/Spline` (.NET, MIT) — homónimo NO relacionado, ignorar.

## Decisiones (detalle en docs/RAZONAMIENTO-WEB3D-MOTION.md)

1. Theatre.js → capability `theatre-sequence` (backlog 179): port de principios (project/sheet/
   sequence/keyframes/easing como JSON determinista + adapter `@theatre/core`; studio dev-only).
2. Threlte → NO portar framework; adoptar Rapier para física en playground/chaos (backlog 180) y
   el patrón CLI gltf→componentes para `website-clone` (backlog 180b).
3. Spline → sin dependencia runtime; guía de embed opcional + assets (backlog 181).
4. PeachWeb → patrones UX (3 pasos, galería, scroll-storytelling) para builder/landing comercial (backlog 182).
