# VENDOR NOTE — LinearAbiltyCastingThreeJS

- **Upstream**: https://github.com/achrefelouafi/LinearAbiltyCastingThreeJS
- **Commit vendido**: `ba61847cb688` (rama main, clon depth-1 del 24/08/2026)
- **Licencia codigo**: MIT (`LICENSE` del upstream). El port en UltraIa
  (`packages/core/src/tools/codevfx.ts`) es un port ORIGINAL de los PRINCIPIOS:
  NADA de codigo copiado (regla vigente desde G0DM0D3/video-use).
- **Binarios incluidos** (decision usuario 24/08/2026, vendor COMPLETO):
  `public/models/*.fbx` + `public/models/diffuse.png` (rig Mixamo + mapa de color) y
  `public/hdri/spruit_sunrise.hdr` + `public/textures/cathedral/*` — segun el propio README
  upstream estos assets RETIENEN SUS LICENCIAS ORIGINALES y no estan cubiertos por el MIT.
  Se incluyen SOLO como referencia de estudio local; NO redistribuir como parte de un
  producto. Si el repo se hace publico, re-evaluar excluirlos.
- **Peso**: ~16 MB / 98 archivos.
- **Uso en UltraIa**: fuente de verdad para el analisis profundo
  (`docs/RAZONAMIENTO-CODEVFX.md` v2) y para el port aditivo de principios avanzados a la
  capability `codevfx` (settings-as-API, records fraccionales, ribbon parametrico,
  beam triple-capa, flicker de dos relojes, perfiles de ruido, SDF en metros,
  GPU particles ring-buffer, phase machine, anti-patron atan-decals, render pipeline).
