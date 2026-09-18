# Agente de Marketing TECH-LIBRARY — operación cero-touch

> Genera imágenes, copies y publicaciones para tu sitio + Instagram + TikTok + LinkedIn + YouTube.
> Tú no haces nada: el agente deja todo listo cada día y publica solo cuando hay tokens.
> Solo le pides cambios cuando quieras ajustar algo.

## Cómo funciona (1 minuto)

1. **Calendario** (`content-calendar.json`): 7 pilares rotativos (tips, snippets, paradigmas, recursos, novedades, motivación, behind-the-scenes) en slots 09:00 / 14:00 / 19:00.
2. **Config** (`autopub.config.json`): marca, 5 canales, idioma `es`, modo `auto-directo` (publica con token; sin token deja `DRAFT`).
3. **Runner** (`generate.py`, solo librería estándar de Python, sin instalar nada):
   - `py generate.py --check` → valida configs sin escribir nada.
   - `py generate.py --dry-run` → genera 3 paquetes de ejemplo en `out/ejemplos/` sin red.
   - `py generate.py` → genera el paquete de hoy en `out/<fecha>-<slug>/` + manifiesto general.
4. **Scheduler** (`schedule.ps1`): registra 3 tareas diarias de Windows que ejecutan el runner.
5. **Motor UltraIa** (ya existente, no se duplica): cuando conectes el repo a UltraIa, `autopub.config.json` alimenta `packages/core/src/tools/autopub.ts` (ciclo F1→F4) y `publishDue` publica en los 5 canales.

## Cero-touch real

- Sin tokens: todo queda en `DRAFT` + imágenes keyless (Pollinations) + reporte MD. Nada falla, nada se inventa.
- Con tokens (cuando los pegues en tu entorno, NUNCA en el repo): el mismo paquete pasa a `READY` y `publishDue` lo publica directo.
- Branding fijo en `BRANDING.md`; canales y placeholders en `CHANNELS.md`.

## Estructura

```
marketing-agent/
  README.md · BRANDING.md · CHANNELS.md
  autopub.config.json · content-calendar.json
  generate.py · schedule.ps1
  out/ejemplos/ (generado, no se commitea lo real; solo .gitkeep)
```

## Comandos

```powershell
cd TECH-LIBRARY/marketing-agent
py generate.py --check
py generate.py --dry-run
py generate.py
```

## Pedir cambios (ejemplos)

- "cambia el tono a más motivador" → edito `autopub.config.json` (tono) + `BRANDING.md`.
- "quiero 2 posts al día" → edito `content-calendar.json` (slots).
- "agrega X" → edito `CHANNELS.md` + config (el motor ya soporta x/threads/telegram/blog).

## Límites honestos

- Video real con voz (edge-tts) y slideshow ffmpeg llegan en el ciclo 188; este ciclo deja imagen + texto + manifiesto (suficiente para las 5 redes).
- Las URLs de tus perfiles son placeholders hasta que las pegues en `CHANNELS.md` (tabla de reemplazo incluida).
