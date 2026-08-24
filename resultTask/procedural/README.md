# Procedural demo â€” librerÃ­as geometry / pngrender / procvid (loop-93)

Artefactos generados 100% desde cÃ³digo determinista (matemÃ¡tica + geometrÃ­a + lÃ³gica),
sin IA generativa ni red. Regenerar con:

```
node_modules\.bin\vite-node.cmd Task/procedural-demo.ts [--quick]
```

## Artefactos

| Archivo | QuÃ© demuestra |
|---|---|
| `supershape*.png` | superfÃ³rmula de Gielis (`m=8,n1=n2=0.5,n3=8`) rasterizada por `pngrender.renderImagePng` |
| `mandelbrot*.png` | puente `generative.mandelbrot` â†’ `pngrender.valuesToRgba` (paleta fire) |
| `mobius.obj` | banda de MÃ¶bius como malla explÃ­cita exportada a Wavefront OBJ |
| `supershape.gltf` | superShape 3D en glTF 2.0 vÃ¡lido (buffer embebido base64; Ã¡brelo en three.js/Blender) |
| `video-frame*.png` | frame de la animaciÃ³n `waves` de `procvid` |

## Video

El MP4 completo se escribe en `.ultraia/procedural/demo-video/demo-video.mp4` (gitignored):
frames PNG reales + ensamblado ffmpeg segÃºn el argv planificado (`libx264 crf18 yuv420p faststart`).
DuraciÃ³n esperada 2s @ 24fps. Verificado con `ffprobe` cuando ffmpeg estÃ¡ disponible.

Estado de esta corrida: `{"rendered":true,"animation":"waves","width":320,"height":640,"fps":24,"framesWritten":48,"mp4":".ultraia\\procedural\\demo-video.mp4","mp4Bytes":37356,"probedDurationSec":2,"expectedDurationSec":2}`

## MÃ³dulos

- `packages/core/src/tools/geometry.ts` â€” superfÃ³rmula de Gielis 2D/3D, MÃ¶bius, ops de malla, glTF/OBJ.
- `packages/core/src/tools/pngrender.ts` â€” encoder PNG puro TypeScript (determinista byte a byte).
- `packages/core/src/tools/procvid.ts` â€” animaciones puras â†’ frames PNG â†’ plan ffmpeg.
