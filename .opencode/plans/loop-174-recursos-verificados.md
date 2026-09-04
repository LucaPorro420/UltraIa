# Plan — loop-174: Recursos reales verificados (videos, podcasts, webs, docs)

## Contexto
El usuario percibe la app "vacía" de material real de aprendizaje y ordena llenarla con
recursos REALES, VERIFICADOS y ACTUALIZADOS (libros, videos, podcasts, audios, webs) en cada
apartado. Regla de hierro: **ninguna URL entra sin verificación** (nada inventado; precedente
del sistema `learning/`: API directa > memoria para datos).

## SPEC
1. **Research**: búsquedas web (máx ~8) para videos flagship (ES primero: midudev/Fazt/HolaMundo;
   EN: Fireship/Traversy/oficiales) + podcasts ES/EN + webs interactivas por tech.
2. **Verificación masiva con curl (sin descargar cuerpos)**:
   - Docs/webs: `HEAD -L` → 200 final.
   - YouTube: `oEmbed` (`youtube.com/oembed?url=…&format=json`) → 200 + título/autor REALES
     (el título embebido es el devuelto, nunca inventado).
   - Podcasts: feed RSS 200 + `<title>` del show + fecha del último `<pubDate>` (prueba de
     "actualizado").
   - Manifiesto `TECH-LIBRARY/RECURSOS.md`: tabla tech/tipo/título/URL/verificado-cómo/fecha.
     Límite honesto: oEmbed no da fecha del video → se anota año del snippet o "s/f".
3. **Implementación** (`index.html`, offline-first: los recursos son METADATOS+enlaces; el
   contenido embebido existente no cambia):
   - `RECURSOS[]`: `{tech,tipo,titulo,url,fuente,nota}` tipos docs|video|web (≥2 por tech:
     docs+web siempre; video donde se verificó).
   - `PODCASTS[]`: `{cat,titulo,url,feed,nota}` (~8-10, ES+EN).
   - Detalle tech: bloque "🌐 Recursos verificados" (badge por tipo + abrir + 🗂️ Guardar).
   - Contador 📎 en cards tech.
   - Agente: intent `recomienda|recursos|videos|podcast` → lista por tema + chip 🎬;
     `guardarRecurso()` → ficha (cita = url + nota, origen = fuente).
   - Los libros YA existen (115 + mapa por sección en detalle tech): no duplicar.
4. **Audios** = episodios de los podcasts (RSS verificados); no se embebe audio (MBs, rompe offline).

## ARCHIVOS A TOCAR
- `TECH-LIBRARY/index.html` (edit: datos + UI + agente + guardar)
- `TECH-LIBRARY/RECURSOS.md` (nuevo: manifiesto de verificación)
- `.opencode/plans/loop-174-recursos-verificados.md` (este plan)

## NO-hacer
- NO inventar URLs/IDs/fechas. NO embeber video/audio. NO tocar `apps/web`, `packages/*`,
  WIP ajeno. NO `git add .`. NO push. Sin deps nuevas.

## Verificación
- Scoped: 100% URLs del manifiesto con 200 (re-corrida curl auditable) + smoke: todo tech
  ≥2 recursos, urls https únicas por tech, PODCASTS≥6 con feed, agente recomienda con enlaces,
  guardarRecurso crea ficha, render vistas OK.
- FULL: typecheck → lint → test → build (árbol quieto; matar `next dev` por regla).
- Aceptación: cada tecnología muestra recursos que ABREN de verdad; feeds con fecha 2024+.

## Predicción
~85 recursos verificados; smoke 60+/60+; 1 commit `feat(biblio)` pathspec 3 archivos.

## Prioridad / Esfuerzo
P0 (da "funcionalidad real") / M (research+verificación dominan).
