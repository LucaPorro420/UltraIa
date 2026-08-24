# Procedural demo — librerías geometry / pngrender / procvid (loop-93)

Artefactos generados 100% desde código determinista (matemática + geometría + lógica),
sin IA generativa ni red. Regenerar con:

```
node_modules\.bin\vite-node.cmd Task/procedural-demo.ts [--quick]
```

## Artefactos

| Archivo | Qué demuestra |
|---|---|
| `supershape*.png` | superfórmula de Gielis (`m=8,n1=n2=0.5,n3=8`) rasterizada por `pngrender.renderImagePng` |
| `mandelbrot*.png` | puente `generative.mandelbrot` → `pngrender.valuesToRgba` (paleta fire) |
| `mobius.obj` | banda de Möbius como malla explícita exportada a Wavefront OBJ |
| `supershape.gltf` | superShape 3D en glTF 2.0 válido (buffer embebido base64; ábrelo en three.js/Blender) |
| `video-frame*.png` | frame de la animación `waves` de `procvid` |

## Video

El MP4 completo se escribe en `.ultraia/procedural/demo-video/demo-video.mp4` (gitignored):
frames PNG reales + ensamblado ffmpeg según el argv planificado (`libx264 crf18 yuv420p faststart`).
Duración esperada 2s @ 24fps. Verificado con `ffprobe` cuando ffmpeg está disponible.

Estado de esta corrida: `{"rendered":true,"animation":"waves","width":320,"height":640,"fps":24,"framesWritten":48,"mp4":".ultraia\\procedural\\demo-video.mp4","mp4Bytes":37356,"probedDurationSec":2,"expectedDurationSec":2}`

## Módulos

- `packages/core/src/tools/geometry.ts` — superfórmula de Gielis 2D/3D, Möbius, ops de malla, glTF/OBJ.
- `packages/core/src/tools/pngrender.ts` — encoder PNG puro TypeScript (determinista byte a byte).
- `packages/core/src/tools/procvid.ts` — animaciones puras → frames PNG → plan ffmpeg.
