# VidRush — fuente cruda (enlaces.txt)

> Descargado 17/08/2026 desde https://vidrush.ai/ (webfetch → markdown; el HTML crudo era
> 2.7MB, se guarda esta versión compacta). Producto: "AI production team for long-form video".

## Qué es

VidRush convierte un brief en un video largo listo para publicar en menos de 1 hora
(documentales, explainers, breakdowns, listicles — 6 a 40 minutos, inglés). Se posiciona
como "un equipo de producción" (researcher, scriptwriter, motion designer, editor, sound
designer — cinco especialistas en paralelo) y no como un generador de frames.

## Patrones clave

1. **Brief → producción, no generación**: un párrafo, un script completo, footage crudo o
   una voiceover. "Composed, not generated": música original + motion graphics adaptados al
   script/pacing/tema (4 direcciones de estilo: modern-minimal-balanced, confident-bold-sharp,
   calm-minimal-soft, energetic-high-contrast).
2. **"Modeled on your channel" (coming soon)**: apunta el pipeline a tu canal y estudia la
   identidad visual — extrae patrones de identidad visual, detecta estructura de pacing y
   ritmo, mapea comportamiento de transiciones, analiza jerarquía tipográfica, escanea el
   lenguaje de composición de thumbnails, clasifica cadencia de edición y cortes.
3. **Aprobación del plan ANTES de generar**: antes de generar un frame, el usuario ve el
   plan completo — script, elecciones de footage, voz, estilo, costo estimado. Ajustar o
   reescribir el brief ahí.
4. **Edición sin regenerar**: editar por chat ("shorter intro, different B-roll, swap the
   music") o en un timeline real con drag-and-drop; las partes aprobadas quedan intactas.
5. **Sourcing con compliance**: elegir de dónde viene el footage por video — CC & Public
   Domain Only / Commercial Stock / General Web Crawling — para que cada video sea seguro
   legalmente.
6. **Precio por minuto terminado**: $1.93-$2.72 por minuto según plan (vs $50-150/video de
   un editor humano). Planes desde $99/mes.
7. **VidRush Atlas (enterprise, coming soon)**: archivo de footage licenciado de la
   organización → videos terminados en el "house style" (documentales, explainers, social
   repurposing), con audit trails y tenancy aislado, SOC 2.

## Métricas públicas

- 100K+ creadores, 3 mil millones de vistas long-form, 50% retención promedio,
  40,000+ videos producidos. Testimonial: costos de producción de $150 → $30 por video
  manteniendo engagement (canal migrado de edición humana a VidRush).

## Mapeo a UltraIa

- Implementado (loop-35, capability `growth`): el perfil de canal ("Modeled on your
  channel") → `analyzeChannel` (pacing, cadencia de cortes, densidad de texto en pantalla,
  hook length, estilo de thumbnail); experimentos de UNA variable con aprobación de plan
  antes de generar → `planExperiments` (ya coherente con la aprobación humana por paquete
  de la cola Publication).
- Pendiente (fuera de alcance del dominio puro): footage sourcing con compliance (los
  generadores OMAG son keyless), editor por chat sobre el timeline real (el render corre en
  runner/scripts con ffmpeg), costo por minuto estimado antes de render.