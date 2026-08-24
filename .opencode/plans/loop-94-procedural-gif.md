# Plan loop-94 — Mejoras procedurales F2: GIF animado puro TS + puente demo

Fecha: 24/08/2026 · Agente: piv-build · Estado: ACTIVO
Disparador: pedido usuario "Continua las mejoras" (bucle PIVR inmediato post-loop-93 GREEN).
Pendientes vivos del [R]-93: GIF encoder puro TS + lección LEARNINGS iter-93 + demo GIF.

## SPEC

1. **pngrender.encodeGif(frames, opts)** — encoder GIF89a ANIMADO 100% TypeScript:
   - Paleta GLOBAL fija determinista RGB332 (256 entradas: 8R×8G×4B... exactamente
     r3g3b2) — sin cuantización compleja, misma entrada → mismos bytes.
   - LZW GIF estándar variable-width (minCodeSize 8, clear 256, EOI 257, dict hasta
     4096 codes, sub-blocks ≤255 bytes).
   - NETSCAPE2.0 loop infinito; GCE por frame con delay en centisegundos.
   - Guardas: ≥1 frame, dims iguales entre frames y pares no requerido (GIF admite
     impares), límite 512px lado y ≤600 frames anti-runaway.
   - `writeGifAtomic(path, bytes)` tmp+rename.
2. **procvid**: `renderGifBytes(spec)` renderiza N frames vía framePixelFn y los
   ensambla con encodeGif; acción `'gif'` en tool `procvid_render` (base64 si pequeño
   o savePath); TOOL_DESCRIPTIONS actualizado (GIF nativo SIN ffmpeg).
3. **LEARNINGS.md**: lección iter-93 (sabotaje concurrente → commits tempranos pathspec,
   backups %TEMP%, merge aditivo sobre HEAD final).
4. **Demo**: procedural-demo.ts genera también `.ultraia/procedural/demo.gif` +
   evidencia ligera en resultTask (gif pequeño).

## DESIGN

- GIF en pngrender.ts (mismo módulo que PNG — cohesión "imágenes"); exports nuevos:
  `encodeGif`, `writeGifAtomic`, tipo `GifFrame`. Sin colisiones (grep previo).
- procvid usa encodeGif; NO toca ffmpeg paths existentes (retrocompatible).
- Wiring llm.ts: solo se amplía el enum `accion` del tool procvid_render + ramas —
  merge aditivo mínimo sobre archivos compartidos (lección 93: ventana corta + commit
  inmediato).

## TEST

- Scoped: gif ~14 tests (firma/trailer/dims LE/GCE delay/NETSCAPE/count frames/
  determinismo/guardas/roundtrip estructura sub-blocks) + procvid +5 (renderGifBytes
  firma+determinismo+frames+guardas+acción gif wiring) ≈ 19 nuevos.
- FULL: typecheck/lint/test/build en orden CI.
- PREDICCIÓN: GIF byte-idéntico entre corridas; tamaño < PNG equivalente ×0.7 para
  arte flat; demo genera demo.gif >2KB reproducible.

## NO-hacer

- NO tocar geom.ts/recordly* (sesión #92).
- NO cuantización median-cut (YAGNI; paleta fija suficiente para arte procedural).
- NO ejecutar ffmpeg (innecesario: GIF ya no lo requiere).
- NO push.

## TOLERANCIAS / RIESGOS

| Riesgo | Mitigación |
|---|---|
| Sabotaje borrador repetido | commits tempranos pathspec + backups %TEMP% inmediatos |
| LZW bug sutil | tests estructurales + validación con ffmpeg/ffprobe en demo real |
| Colisión exports | grep previo nombres (encodeGif/GifFrame/writeGifAtomic) |

Esfuerzo: ~medio ciclo. Prioridad P2.
