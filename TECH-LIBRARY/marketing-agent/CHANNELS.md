# CANALES — placeholders + cómo conectar

> Hoy todo funciona con placeholders (pedido del usuario). Cuando quieras publicar de verdad,
> reemplaza la columna `placeholder` por tu URL/handle real y pega el token SOLO en tu entorno
> (nunca en el repo). Sin token, el agente deja `DRAFT` (no falla).

## Tabla de canales

| Canal | Key config | Placeholder actual | Formato | Límite texto | Qué genera el agente |
|---|---|---|---|---|---|
| sitio web (blog) | `web` | `https://TU-SITIO-TUTORIALES.example.com/recursos` | artículo + portada 16:9 | 300-600 palabras | titular, resumen, portada 1280x720, CTA a biblioteca |
| Instagram Reels | `instagram` | `https://www.instagram.com/TU_USUARIO/` | vertical 9:16 | caption 2200 | caption + 12 hashtags + portada 1080x1920 |
| TikTok | `tiktok` | `https://www.tiktok.com/@TU_USUARIO` | vertical 9:16 | 150 caracteres gancho | gancho + caption + hashtags + portada 1080x1920 |
| LinkedIn | `linkedin` | `https://www.linkedin.com/company/TU_EMPRESA/` | horizontal 1.91:1 | 3000 (usamos 150-300 palabras) | post profesional 0 emojis + portada 1200x627 |
| YouTube Shorts | `youtube_shorts` | `https://www.youtube.com/@TU_CANAL` | vertical 9:16 | título 100 + desc 5000 | título + descripción + tags + portada 1080x1920 |

## Tokens (entorno, nunca repo)

| Var entorno | Canal | Dónde se pega |
|---|---|---|
| `IG_ACCESS_TOKEN` + `IG_USER_ID` | Instagram Graph v21 | tu servidor/entorno (ej. `.env` local no commiteado) |
| `TIKTOK_ACCESS_TOKEN` | TikTok | idem |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn Posts API | idem |
| `YOUTUBE_ACCESS_TOKEN` | YouTube Data v3 | idem |

Con las 4 vacías → modo `DRAFT` (recomendado para empezar). Con alguna presente → ese canal pasa a `READY` y `publishDue` lo publica directo (modo auto-directo elegido).

## Dónde reemplazar

1. Este archivo: columna placeholder → tus URLs reales.
2. `autopub.config.json`: objeto `channels` → tus URLs reales (mismos placeholders).
3. Tu repo `PLATAFORMA-TOTAL…` (SSH `git@github.com:SoftEngAi-dev/PLATAFORMA-TOTAL-DE-APRENDIZAJE-DESARROLLO-E-IA-AUT-NOMA.git`): nada que cambiar hoy; cuando clones ese repo, copia esta carpeta `marketing-agent/` a su raíz y funciona igual (runner stdlib, sin dependencias).

## Verificación

```powershell
py generate.py --check   # valida que los 5 placeholders existen y el calendario tiene 7 pilares
```
