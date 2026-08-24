# Plan loop-95 — Mejoras procedurales F3: cuantización median-cut para GIF

Fecha: 24/08/2026 · Agente: piv-build · Estado: ACTIVO
Disparador: "Continua" (bucle inmediato post-94 GREEN). Pendiente [R]-94:
median-cut para paletas optimizadas.

## SPEC

1. **`pngrender.quantizeMedianCut(frames, opts)`** — paleta adaptativa determinista:
   - Muestreo FIJO de píxeles (step calculado para ≤16k muestras/frame combinadas).
   - Cajas RGB: split recurrente por el canal de MAYOR rango; tie-break r>g>b;
     punto de corte = mediana EXACTA del canal en la caja (sorted copy, índice
     floor(len/2)); cola de cajas procesada por mayor count (tie: orden de creación).
   - Color de caja = PROMEDIO entero de sus píxeles. Parar al alcanzar maxColors
     (default 256, se permite menor si la imagen tiene menos colores distintos).
   - Salida: `{ palette: Uint8Array (3*n), size: n (potencia de 2 >= #colores reales
     tras padding con negro), indexOf(r,g,b): nearest por distancia euclídea cuadrática
     con CACHE Map<number,number> clave r<<16|g<<8|b }` — todo determinista.
2. **`encodeGif` gana `palette?: 'rgb332' | 'mediancut'`** (default 'rgb332'
   RETROCOMPATIBLE byte-exact — test lo prueba). Con mediancut: GCT = paleta
   adaptativa (sizeBits según n), índices via quantizer; minCodeSize dinámico
   = log2(size) (>=2, <=8).
3. **`procvid.renderGifBytes` propaga `palette`** vía RenderGifOptions.
4. Demo: genera demo-gif-mc.gif + compara tamaños rgb332 vs mediancut en manifest.

## DESIGN

- Todo dentro de pngrender.ts (cohesión imágenes). Exports nuevos: quantizeMedianCut,
  tipo MedianCutResult. Sin colisiones (verificado).
- LZW reutilizado tal cual (minCodeSize pasa a parámetro de lzwEncodeGif).
- Retrocompatibilidad: palette 'rgb332' produce BYTES IDÉNTICOS a los tests 94.

## TEST (~12)

- Paleta: tamaño potencia de 2; color sólido → su color exacto presente y mapeado;
  gradiente 2-color separa bien; determinismo ×2.
- encodeGif mediancut: firma/trailer/NETSCAPE intactos; índices < size (decoder
  roundtrip reutilizando el decoder mínimo del test 94 con minCodeSize dinámico);
  bytes ≠ rgb332 (paletas distintas) PERO rgb332 explícito === salida legacy byte-exact.
- Guardas: maxColors inválido (<2 o >256) rechazado.
- procvid: renderGifBytes({palette:'mediancut'}) firma ok + determinista.
- PREDICCIÓN: gif mediancut de shape-morph ≤ rgb332 (mejor agrupación) o similar;
  FULL verde.

## NO-hacer

- NO dithering (Floyd-Steinberg YAGNI ahora; rompería determinismo simple).
- NO tocar geom/recordly/publications.
- NO push.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| Off-by-one cadencia LZW con minCodeSize<8 | roundtrip decoder con size dinámico ya probado |
| Sabotaje actor | commits tempranos pathspec + backups %TEMP% |
| Perf nearest-color O(px*256) | cache por color único (arte procedural tiene pocos) |

Esfuerzo: medio ciclo. Prioridad P2.
