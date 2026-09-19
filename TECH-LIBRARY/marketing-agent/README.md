# Agente de Marketing TECH-LIBRARY — operación cero-touch

> Genera imágenes, videos con voz, copies y publicaciones para tu sitio + Instagram + TikTok + LinkedIn + YouTube.
> Tú no haces nada: el agente deja todo listo cada día y publica solo cuando hay tokens.
> **Sin teléfono, sin cuentas obligatorias**: todo se produce en tu PC (CPU + ffmpeg + voz Windows offline).
> Solo le pides cambios cuando quieras ajustar algo.

## Cómo funciona (1 minuto)

1. **Doctor** (`doctor.py`): inventaría tu PC (CPUs, RAM, disco, ffmpeg, voces offline, fuentes) → `recursos.json`. La fábrica se adapta sola.
2. **Calendario** (`content-calendar.json`): 7 pilares rotativos (tips, snippets, paradigmas, recursos, novedades, motivación, behind-the-scenes) en slots 09:00 / 14:00 / 19:00.
3. **Config** (`autopub.config.json`): marca, 5 canales, idioma `es`, modo `local-cero` (produce bytes reales sin teléfono ni cuentas; con token publica directo, sin token deja `DRAFT`).
4. **Fábrica** (`factory.py`, librería estándar + ffmpeg + voz Windows, sin instalar nada):
   - `py factory.py --check` → backends + nivel, sin escribir nada.
   - `py factory.py --demo` → 1 pack completo (`portada.png` + `reel.mp4` 9:16 + `narracion.wav` ES + `paquete.json`).
   - `py factory.py --todo` → los 3 packs del día.
5. **Textos** (`generate.py`): captions/hashtags/manifiesto por canal (reutilizado por la fábrica, no duplicado).
6. **Galería** (`serve.py`): `py serve.py` → ver/descargar todo en `http://127.0.0.1:8765` sin cuentas.
7. **Scheduler** (`schedule.ps1`): registra 3 fábricas diarias + doctor semanal en Windows.
8. **Motor UltraIa** (ya existente, no se duplica): cuando conectes cuentas, `publishDue` publica en los 5 canales.

## Cero-touch real

- Sin tokens: todo queda en `DRAFT` + imágenes keyless (Pollinations) + reporte MD. Nada falla, nada se inventa.
- Con tokens (cuando los pegues en tu entorno, NUNCA en el repo): el mismo paquete pasa a `READY` y `publishDue` lo publica directo.
- Branding fijo en `BRANDING.md`; canales y placeholders en `CHANNELS.md`.

## Estructura

```
marketing-agent/
  README.md · BRANDING.md · CHANNELS.md
  autopub.config.json · content-calendar.json · recursos.json
  generate.py · factory.py · doctor.py · serve.py · schedule.ps1
  out/ (generado, gitignored: packs + .fonts/)
```

## Comandos

```powershell
cd TECH-LIBRARY/marketing-agent
py doctor.py                 # inventario del PC -> recursos.json
py factory.py --check        # backends + nivel
py factory.py --demo         # 1 pack con imagen + video + voz
py factory.py --todo         # 3 packs del día
py serve.py                  # galería local http://127.0.0.1:8765
py generate.py --dry-run     # solo textos de ejemplo (sin video/voz)
```

## Pedir cambios (ejemplos)

- "cambia el tono a más motivador" → edito `autopub.config.json` (tono) + `BRANDING.md`.
- "quiero 2 posts al día" → edito `content-calendar.json` (slots).
- "agrega X" → edito `CHANNELS.md` + config (el motor ya soporta x/threads/telegram/blog).

## Límites honestos

- Producción local verificada en este PC: portada 1080x1920 con titular + video 9:16 ~7s + narración ES offline (nivel FULL).
- Las URLs de tus perfiles son placeholders hasta que las pegues en `CHANNELS.md`; los tokens van a tu `.env` local (nunca al repo) y las cuentas se adicionan después, sin teléfono.
- TikTok/LinkedIn-empresa/YouTube-público requieren aprobación de cada plataforma (trámite humano, días); mientras tanto todo queda en `DRAFT` listo.
