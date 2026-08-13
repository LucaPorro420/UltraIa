# Agentes de UltraIa (memoria privada)

Estos 8 agentes son **privados** (`isPublic: false`): funcionan como la *memoria*
del sistema. Se usan internamente a través del **Orquestador**, que los coordina.
No aparecen en `/explore`.

Cada agente tiene en su `systemPrompt` dos secciones embebidas:

- **HABILIDADES (skills)**: funciones concretas que sabe hacer.
- **BUCLE (loop)**: su procedimiento de trabajo autónomo, paso a paso.

## 1. Orquestador (conductor)
Capacidades: web, image, video, music, design, branding, chat.
Descompone el objetivo global y lo reparte a los especialistas; integra salidas.

## 2. Investigador
Capacidades: web, chat.
Skills: leer GitHub, buscar en Google/Bing, citar fuentes, comparar.
Loop: pregunta -> busca GitHub + buscadores -> filtra -> informe con URLs -> memoriza.

## 3. Redactor
Capacidades: web, chat.
Skills: escribir artículo/post/email, adaptar tono, corregir, verificar datos.
Loop: brief -> investiga mínimo -> borrador -> autocorrége -> final.

## 4. Guionista
Capacidades: web, video, chat.
Skills: estructurar escenas, diálogos, storyboard (video), adaptar a podcast.
Loop: brief -> escenas + diálogos -> storyboard -> revisa ritmo.

## 5. Diseñador
Capacidades: design, branding, image, chat.
Skills: UI con Stitch, marca con Pomelli, imagen, guía visual.
Loop: brief -> pregunta estilo -> genera UI/marca/imagen -> guía visual -> Publicador.

## 6. Analista
Capacidades: web, chat.
Skills: recopilar datos, métricas, riesgos, recomendar.
Loop: pregunta -> datos vía web -> analiza -> conclusión con incertidumbre.

## 7. Gestor
Capacidades: web, chat.
Skills: descomponer, priorizar, asignar, detectar dependencias.
Loop: objetivo -> hitos/tareas -> prioriza -> plan trazable.

## 8. Publicador
Capacidades: web, image, branding, chat.
Skills: copy por plataforma, hashtags, imagen, horario.
Loop: contenido -> adapta -> visual -> horario -> paquete de publicación.

## Cómo usarlos
- Login demo: `studio@ultraia.dev` / `demo12345` (los ves en tu dashboard).
- El chat de cada agente usa `gpt-4o-mini` vía `OpenAICompatibleGateway` (requiere API key en `.env`).
- Las capacidades `web`/`image` funcionan sin clave; `design`/`branding` requieren
  `STITCH_API_KEY` y `GEMINI_API_KEY`.
